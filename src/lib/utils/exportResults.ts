/**
 * Export exam results to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) {
        alert("Aucune donnée à exporter")
        return
    }

    // Get headers from first object
    const headers = Object.keys(data[0])

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header]
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`
                }
                return value
            }).join(',')
        )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * Export exam results to PDF format (placeholder)
 * TODO: Implement with a library like jsPDF or react-pdf
 */
export function exportToPDF(data: any[], filename: string) {
    alert("Fonctionnalité d'export PDF en cours de développement. Utilisez l'export CSV pour le moment.")

    // Future implementation with jsPDF:
    // import jsPDF from 'jspdf'
    // import 'jspdf-autotable'
    // 
    // const doc = new jsPDF()
    // doc.text('Résultats de l\'examen', 14, 15)
    // doc.autoTable({
    //     head: [Object.keys(data[0])],
    //     body: data.map(row => Object.values(row))
    // })
    // doc.save(`${filename}.pdf`)
}

/**
 * Format attempt data for export
 */
export function formatAttemptsForExport(attempts: any[]) {
    return attempts.map(attempt => ({
        'Étudiant': attempt.userId?.name || 'N/A',
        'Email': attempt.userId?.email || 'N/A',
        'Score': `${attempt.score}/${attempt.maxScore}`,
        'Pourcentage': `${attempt.percentage.toFixed(1)}%`,
        'Temps (min)': Math.round(attempt.timeSpent / 60),
        'Statut': attempt.passed ? 'Réussi' : 'Échoué',
        'Date': new Date(attempt.submittedAt).toLocaleString('fr-FR')
    }))
}

/**
 * Format question analysis for export
 */
export function formatQuestionAnalysisForExport(questions: any[]) {
    return questions.map((q, index) => ({
        'Question': `Q${index + 1}`,
        'Énoncé': q.questionText,
        'Réponses totales': q.totalResponses,
        'Réponses correctes': q.correctResponses,
        'Taux de réussite': `${q.percentageCorrect.toFixed(1)}%`,
        'Temps moyen (s)': Math.round(q.averageTimeSpent)
    }))
}
