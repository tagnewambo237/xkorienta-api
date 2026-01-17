import {
    EducationalComponent,
    EducationalComponentFactory
} from '@/lib/patterns/EducationalHierarchy'
import mongoose from 'mongoose'

/**
 * Service pour naviguer et manipuler la hiérarchie éducative
 * Utilise le Composite Pattern
 */
export class EducationalHierarchyService {
    /**
     * Obtient le chemin complet d'un élément (breadcrumb)
     */
    static async getBreadcrumb(
        type: string,
        id: mongoose.Types.ObjectId
    ): Promise<{ name: string; code: string; type: string }[]> {
        const component = await EducationalComponentFactory.createFromId(type, id)
        if (!component) {
            return []
        }

        const ancestors = await component.getAncestors()
        const path = [...ancestors, component]

        return path.map((item, index) => ({
            name: item.name,
            code: item.code,
            type: this.getComponentType(item)
        }))
    }

    /**
     * Obtient l'arbre complet d'un élément
     */
    static async getTree(
        type: string,
        id: mongoose.Types.ObjectId,
        maxDepth: number = 3
    ): Promise<any> {
        const component = await EducationalComponentFactory.createFromId(type, id)
        if (!component) {
            return null
        }

        return this.buildTree(component, 0, maxDepth)
    }

    private static async buildTree(
        component: EducationalComponent,
        currentDepth: number,
        maxDepth: number
    ): Promise<any> {
        const node = {
            _id: component._id,
            name: component.name,
            code: component.code,
            type: this.getComponentType(component),
            children: [] as any[]
        }

        if (currentDepth < maxDepth) {
            const children = await component.getChildren()
            node.children = await Promise.all(
                children.map(child => this.buildTree(child, currentDepth + 1, maxDepth))
            )
        }

        return node
    }

    /**
     * Recherche dans la hiérarchie
     */
    static async search(
        rootType: string,
        rootId: mongoose.Types.ObjectId,
        query: string
    ): Promise<EducationalComponent[]> {
        const root = await EducationalComponentFactory.createFromId(rootType, rootId)
        if (!root) {
            return []
        }

        const results: EducationalComponent[] = []
        const descendants = await root.getDescendants()

        for (const descendant of descendants) {
            if (
                descendant.name.toLowerCase().includes(query.toLowerCase()) ||
                descendant.code.toLowerCase().includes(query.toLowerCase())
            ) {
                results.push(descendant)
            }
        }

        return results
    }

    /**
     * Obtient tous les éléments d'un niveau spécifique
     */
    static async getByLevel(
        rootType: string,
        rootId: mongoose.Types.ObjectId,
        targetType: string
    ): Promise<EducationalComponent[]> {
        const root = await EducationalComponentFactory.createFromId(rootType, rootId)
        if (!root) {
            return []
        }

        const descendants = await root.getDescendants()
        return descendants.filter(d => this.getComponentType(d) === targetType)
    }

    /**
     * Compte les éléments par type
     */
    static async countByType(
        rootType: string,
        rootId: mongoose.Types.ObjectId
    ): Promise<Record<string, number>> {
        const root = await EducationalComponentFactory.createFromId(rootType, rootId)
        if (!root) {
            return {}
        }

        const descendants = await root.getDescendants()
        const counts: Record<string, number> = {}

        for (const descendant of descendants) {
            const type = this.getComponentType(descendant)
            counts[type] = (counts[type] || 0) + 1
        }

        return counts
    }

    /**
     * Vérifie si un élément est ancêtre d'un autre
     */
    static async isAncestorOf(
        ancestorType: string,
        ancestorId: mongoose.Types.ObjectId,
        descendantType: string,
        descendantId: mongoose.Types.ObjectId
    ): Promise<boolean> {
        const descendant = await EducationalComponentFactory.createFromId(
            descendantType,
            descendantId
        )
        if (!descendant) {
            return false
        }

        const ancestors = await descendant.getAncestors()
        return ancestors.some(a => a._id.toString() === ancestorId.toString())
    }

    /**
     * Obtient le chemin le plus court entre deux éléments
     */
    static async getPathBetween(
        fromType: string,
        fromId: mongoose.Types.ObjectId,
        toType: string,
        toId: mongoose.Types.ObjectId
    ): Promise<EducationalComponent[]> {
        const from = await EducationalComponentFactory.createFromId(fromType, fromId)
        const to = await EducationalComponentFactory.createFromId(toType, toId)

        if (!from || !to) {
            return []
        }

        // Obtenir les ancêtres des deux éléments
        const fromAncestors = await from.getAncestors()
        const toAncestors = await to.getAncestors()

        // Trouver l'ancêtre commun le plus proche
        let commonAncestor: EducationalComponent | null = null
        for (let i = fromAncestors.length - 1; i >= 0; i--) {
            const ancestor = fromAncestors[i]
            if (toAncestors.some(a => a._id.toString() === ancestor._id.toString())) {
                commonAncestor = ancestor
                break
            }
        }

        if (!commonAncestor) {
            return []
        }

        // Construire le chemin
        const pathFromCommon = fromAncestors
            .slice(fromAncestors.indexOf(commonAncestor) + 1)
            .reverse()
        const pathToCommon = toAncestors.slice(toAncestors.indexOf(commonAncestor) + 1)

        return [...pathFromCommon, commonAncestor, ...pathToCommon, to]
    }

    /**
     * Obtient les statistiques d'un élément
     */
    static async getStats(
        type: string,
        id: mongoose.Types.ObjectId
    ): Promise<{
        depth: number
        childrenCount: number
        descendantsCount: number
        siblingsCount: number
        isLeaf: boolean
        path: string[]
    }> {
        const component = await EducationalComponentFactory.createFromId(type, id)
        if (!component) {
            throw new Error('Component not found')
        }

        const [depth, childrenCount, descendantsCount, siblingsCount, isLeaf, path] =
            await Promise.all([
                component.getDepth(),
                component.countChildren(),
                component.countDescendants(),
                component.getSiblings().then(s => s.length),
                component.isLeaf(),
                component.getPath()
            ])

        return {
            depth,
            childrenCount,
            descendantsCount,
            siblingsCount,
            isLeaf,
            path
        }
    }

    /**
     * Détermine le type d'un composant
     */
    private static getComponentType(component: EducationalComponent): string {
        const className = component.constructor.name
        return className.replace('Component', '')
    }

    /**
     * Valide la cohérence de la hiérarchie
     */
    static async validateHierarchy(
        type: string,
        id: mongoose.Types.ObjectId
    ): Promise<{
        valid: boolean
        errors: string[]
    }> {
        const errors: string[] = []
        const component = await EducationalComponentFactory.createFromId(type, id)

        if (!component) {
            return { valid: false, errors: ['Component not found'] }
        }

        // Vérifier les cycles
        const ancestors = await component.getAncestors()
        const ancestorIds = ancestors.map(a => a._id.toString())
        if (ancestorIds.includes(component._id.toString())) {
            errors.push('Circular reference detected')
        }

        // Vérifier que tous les enfants ont ce composant comme parent
        const children = await component.getChildren()
        for (const child of children) {
            const childParent = await child.getParent()
            if (!childParent || childParent._id.toString() !== component._id.toString()) {
                errors.push(`Child ${child.name} has incorrect parent reference`)
            }
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }
}
