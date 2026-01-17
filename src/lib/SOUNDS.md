# 🎵 Sound Effects

This application uses the Web Audio API to generate pleasant UI feedback sounds.

## Available Sounds

### 1. **Select Sound** 🎯
- **Trigger**: When a user selects an answer option
- **Description**: Short, pleasant beep (800Hz sine wave)
- **Duration**: 100ms

### 2. **Success Sound** ✨
- **Trigger**: When navigating between questions successfully
- **Description**: Cheerful ascending notes (C5 → E5 → G5)
- **Duration**: ~300ms

### 3. **Complete Sound** 🎉
- **Trigger**: When submitting the exam
- **Description**: Triumphant fanfare (C5 → E5 → G5 → C6)
- **Duration**: ~750ms

## Implementation

All sounds are generated programmatically using the Web Audio API, which means:
- ✅ No external audio files needed
- ✅ Small bundle size
- ✅ Works in all modern browsers
- ✅ Graceful degradation if audio context is unavailable

## Usage

```typescript
import { playSound } from '@/lib/sounds'

// Play a sound
playSound('select')
playSound('success')
playSound('complete')
```

## Browser Compatibility

The Web Audio API is supported in all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅

Note: Some browsers may require user interaction before playing audio (autoplay policies).
