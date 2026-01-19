# Architecture Backend & Standards de Code

> **Dernière mise à jour:** Janvier 2026
> **Auteur:** Équipe Technique (IA & Humain)

Ce document décrit l'architecture adoptée pour le backend de l'application Quizlock API, ainsi que les standards de qualité de code à respecter.

---

## 🏗️ Architecture Globale

Nous suivons une architecture en couches classiques (Layered Architecture) utilisant le pattern **Route-Controller-Service-Repository**. Cette séparation des responsabilités permet une meilleure maintenabilité, testabilité et évolutivité du code.

### Vue d'ensemble des Couches

1.  **Incoming Request (Route)**
    *   **Responsabilité :** Point d'entrée HTTP ultra-léger.
    *   **Rôle :** Reçoit la requête Next.js standard (`Request`) et la délègue immédiatement au contrôleur approprié.
    *   **Localisation :** `src/app/api/.../route.ts`

2.  **Controller Layer**
    *   **Responsabilité :** Gestion du protocole HTTP et orchestration.
    *   **Rôle :**
        *   Parse le corps de la requête (JSON, FormData, etc.).
        *   Effectue la validation basique des entrées (présence des champs requis).
        *   Appelle le(s) Service(s) approprié(s).
        *   Gère les erreurs et retourne une réponse HTTP standardisée (`NextResponse`) avec les bons codes de statut (200, 400, 401, 500...).
    *   **Localisation :** `src/lib/controllers/...`

3.  **Service Layer**
    *   **Responsabilité :** Logique métier pure.
    *   **Rôle :**
        *   Implémente les règles métier complexes (calculs, workflows, validations métier avancées).
        *   Interagit avec plusieurs Repositories si nécessaire.
        *   Est agnostique du contexte HTTP (ne connaît pas `NextResponse` ni `Request/Response`).
        *   Lève des erreurs métier (`throw new Error(...)`) qui seront attrapées par le Controller.
    *   **Localisation :** `src/lib/services/...`

4.  **Repository Layer**
    *   **Responsabilité :** Accès aux données.
    *   **Rôle :**
        *   Interagit directement avec la base de données (via Mongoose/MongoDB).
        *   Encapsule les requêtes complexes.
        *   Retourne des modèles de données ou des DTOs.
    *   **Localisation :** `src/lib/repositories/...`

5.  **Model Layer**
    *   **Responsabilité :** Définition des schémas de données.
    *   **Rôle :** Définit la structure des documents MongoDB et les types TypeScript associés.
    *   **Localisation :** `src/models/...`

---

## 🛠️ Standards de Qualité de Code

### 1. Typage TypeScript
*   Utiliser le **typage strict** autant que possible.
*   Éviter `any` sauf cas exceptionnels ou temporaires.
*   Définir des interfaces pour les Repositories et Services si l'injection de dépendances est utilisée.

### 2. Gestion des Erreurs
*   Les **Services** lèvent des exceptions (`throw Error`) avec des messages clairs.
*   Les **Controllers** attrapent ces exceptions (`try/catch`) et les traduisent en réponses HTTP appropriées (400 Bad Request, 404 Not Found, 500 Internal Server Error).
*   Ne jamais laisser une erreur faire planter le serveur.

### 3. Conventions de Nommage
*   **Fichiers :** PascalCase pour les classes (`AuthService.ts`), camelCase pour les utilitaires.
*   **Classes :** PascalCase (`AuthController`).
*   **Méthodes :** camelCase (`verifyCredentials`).

### 4. Sécurité
*   Ne jamais stocker de mots de passe en clair (utiliser `bcrypt`).
*   Ne jamais faire confiance aux entrées utilisateur (validation dans le Controller ou via Zod).
*   Utiliser des variables d'environnement pour les secrets (`process.env`).

### 5. Exemple d'Implémentation (Flux complet)

**Route:**
```typescript
export async function POST(req: Request) {
    return AuthController.verify(req);
}
```

**Controller:**
```typescript
export class AuthController {
    static async verify(req: Request) {
        try {
            const body = await req.json();
            const user = await authService.verifyCredentials(body.email, body.password);
            return NextResponse.json(user);
        } catch (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }
    }
}
```

**Service:**
```typescript
export class AuthService {
    async verifyCredentials(email, password) {
        if (!email) throw new Error("Email required");
        // ... logique métier
        return user;
    }
}
```

---

## 🚀 Bonnes Pratiques Additionnelles

*   **DRY (Don't Repeat Yourself):** Centraliser la logique réutilisable.
*   **Clean Code:** Fonctions courtes, noms de variables explicites.
*   **Asynchronicité:** Utiliser `async/await` pour tout appel I/O (base de données, API externe).
