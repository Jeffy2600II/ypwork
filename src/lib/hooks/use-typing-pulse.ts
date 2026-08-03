'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · useTypingPulse (v3.8.1)
// ═══════════════════════════════════════════════════════════════
// Hook that detects whether the user added or deleted a character
// in a controlled input, and toggles the appropriate CSS class
// (is-typing-forward / is-typing-backward) for a short pulse.
//
// WHY THIS EXISTS
// ───────────────
// The user asked for "characters appearing/deleting with a smooth
// transition" on login & register pages. Native <input> elements
// don't expose per-character rendering, so we can't animate
// individual characters without refactoring to contenteditable.
//
// This hook is a pragmatic approximation: when the value length
// increases, we add `is-typing-forward` (subtle scale up) — when it
// decreases, we add `is-typing-backward` (subtle scale down). The
// class auto-removes after 180ms, creating a "typing pulse" effect
// that feels native-app-like.
//
// USAGE
// ─────
//   const inputProps = useTypingPulse({
//     value: nationalId,
//     onChange: handleNationalIdChange,
//     targetClassName: 'yp-input',     // class to apply pulse to (the input itself)
//     wrapperClassName: 'input-group', // optional wrapper class to also pulse
//   });
//
//   <div className={inputProps.wrapperClassName}>
//     <input {...inputProps.inputProps} />
//   </div>
//
// HOW IT WORKS
// ────────────
// 1. We track the previous value length in a ref.
// 2. On each change event, we compare new length vs previous.
// 3. If new > old → add `is-typing-forward` class.
// 4. If new < old → add `is-typing-backward` class.
// 5. After 180ms, remove the class.
// 6. The class is applied to BOTH the input element AND the wrapper
//    (if wrapperClassName is provided), so the pulse looks cohesive.
//
// STABILITY NOTES
// ───────────────
// - Uses refs for the timer + previous length → no extra renders.
// - Cleans up the timer on unmount.
// - Respects controlled input pattern (caller still owns the value).
// - Works with paste, cut, autocomplete, IME composition.
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';

export interface UseTypingPulseOptions {
  /** Current value of the controlled input. */
  value: string;
  /**
   * Original onChange handler. Typed as `any` so callers can pass either
   * an `<input>`-only or `<textarea>`-only handler without type errors.
   * The hook calls this with the actual event from the input element —
   * the type is correct at runtime because React ensures the element
   * matches the handler it's attached to.
   */
  onChange?: (e: any) => void;
  /** Class name applied to the input element (used to compute final className). */
  inputClassName?: string;
  /** Class name applied to the wrapper element (e.g. 'input-group'). */
  wrapperClassName?: string;
  /** Pulse duration in ms (default 180). */
  pulseDuration?: number;
}

export interface UseTypingPulseResult {
  /** Props to spread onto the <input> or <textarea> element. */
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    className: string;
    ref: React.RefCallback<HTMLElement>;
  };
  /** Class name to apply to the wrapper element (includes pulse class when active). */
  wrapperClassName: string;
}

export function useTypingPulse({
  value,
  onChange,
  inputClassName = 'yp-input',
  wrapperClassName: baseWrapper = '',
  pulseDuration = 180,
}: UseTypingPulseOptions): UseTypingPulseResult {
  const prevLengthRef = React.useRef(value.length);
  const pulseClassRef = React.useRef<string>('');
  const timerRef = React.useRef<number | null>(null);
  const inputElRef = React.useRef<HTMLElement | null>(null);
  const wrapperElRef = React.useRef<HTMLElement | null>(null);

  // ── Apply pulse class to the input element + wrapper ──
  const applyPulseClass = React.useCallback((cls: string) => {
    // Remove old pulse class from input
    if (inputElRef.current && pulseClassRef.current) {
      inputElRef.current.classList.remove(pulseClassRef.current);
    }
    // Remove old pulse class from wrapper
    if (wrapperElRef.current && pulseClassRef.current) {
      wrapperElRef.current.classList.remove(pulseClassRef.current);
    }
    // Add new pulse class
    if (cls) {
      if (inputElRef.current) {
        inputElRef.current.classList.add(cls);
      }
      if (wrapperElRef.current) {
        wrapperElRef.current.classList.add(cls);
      }
    }
    pulseClassRef.current = cls;
  }, []);

  // ── Clear timer on unmount ──
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // ── Wrapped onChange — detects add/delete and applies pulse ──
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newLen = newValue.length;
      const oldLen = prevLengthRef.current;

      // Detect direction
      let pulseClass = '';
      if (newLen > oldLen) {
        pulseClass = 'is-typing-forward';
      } else if (newLen < oldLen) {
        pulseClass = 'is-typing-backward';
      }
      // If newLen === oldLen (e.g. replace), no pulse

      prevLengthRef.current = newLen;

      // Clear any existing timer
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      // Apply the new pulse class
      if (pulseClass) {
        applyPulseClass(pulseClass);
        // Schedule removal
        timerRef.current = window.setTimeout(() => {
          applyPulseClass('');
          timerRef.current = null;
        }, pulseDuration);
      }

      // Call the original onChange
      if (onChange) {
        onChange(e);
      }
    },
    [onChange, applyPulseClass, pulseDuration]
  );

  // ── ref callback — store the input element so we can toggle classes ──
  const inputRef = React.useCallback((el: HTMLElement | null) => {
    inputElRef.current = el;
    // Also find the closest wrapper (parent .input-group, if any)
    if (el && baseWrapper) {
      // Walk up to find the wrapper element
      let parent = el.parentElement;
      while (parent && !parent.classList.contains(baseWrapper)) {
        parent = parent.parentElement;
        if (!parent) break;
      }
      wrapperElRef.current = parent || null;
    } else {
      wrapperElRef.current = null;
    }
  }, [baseWrapper]);

  // ── Compute final className for the input ──
  // The pulse class is applied via direct DOM manipulation (classList),
  // so the className here is just the base class. This avoids re-rendering
  // the component on every keystroke (which would be expensive).
  const finalInputClassName = inputClassName;

  return {
    inputProps: {
      value,
      onChange: handleChange,
      className: finalInputClassName,
      ref: inputRef as React.RefCallback<HTMLInputElement>,
    },
    wrapperClassName: baseWrapper,
  };
}
