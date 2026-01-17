// Sound effects for the quiz application
export const sounds = {
    // Click/selection sound - short beep
    select: () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
    },

    // Success sound - cheerful ascending notes
    success: () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const notes = [523.25, 659.25, 783.99] // C5, E5, G5

        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = freq
            oscillator.type = 'sine'

            const startTime = audioContext.currentTime + (index * 0.1)
            gainNode.gain.setValueAtTime(0.2, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

            oscillator.start(startTime)
            oscillator.stop(startTime + 0.2)
        })
    },

    // Completion sound - triumphant fanfare
    complete: () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const melody = [
            { freq: 523.25, time: 0 },    // C5
            { freq: 659.25, time: 0.15 },  // E5
            { freq: 783.99, time: 0.3 },   // G5
            { freq: 1046.5, time: 0.45 },  // C6
        ]

        melody.forEach(({ freq, time }) => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = freq
            oscillator.type = 'triangle'

            const startTime = audioContext.currentTime + time
            gainNode.gain.setValueAtTime(0.25, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

            oscillator.start(startTime)
            oscillator.stop(startTime + 0.3)
        })
    },

    // Error/warning sound - descending harsh tones
    error: () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const notes = [440, 349.23, 261.63] // A4, F4, C4 - descending minor feel

        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = freq
            oscillator.type = 'sawtooth' // Harsher sound for error

            const startTime = audioContext.currentTime + (index * 0.12)
            gainNode.gain.setValueAtTime(0.15, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)

            oscillator.start(startTime)
            oscillator.stop(startTime + 0.15)
        })
    }
}

// Helper function to play sounds safely
export function playSound(soundName: keyof typeof sounds) {
    try {
        sounds[soundName]()
    } catch (error) {
        console.warn('Could not play sound:', error)
    }
}
