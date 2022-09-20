import { useEffect, useRef, useState } from "react";

// Returns the result of f, computed on the first call and recomputed whenever the window changes size.
export function useLayoutDependentValue<T>(f: () => T): T {
  const [state, setState] = useState<T>(() => f());

  useEffect(() => {
    function computeValue() {
      setState(f());
    }
    // Compute the value the first time, or when effect triggers due to function change
    computeValue();
    window.addEventListener("resize", computeValue);
    return () => window.removeEventListener("resize", computeValue);
  }, [f]);

  return state;
}

// Returns the result of f, computed on the first call, recomputed whenever the window changes size or the value callback changes
export function useAsyncLayoutDependentValue<T>(
  initialValue: T,
  f: () => Promise<T>,
): T {
  const [state, setState] = useState<T>(initialValue);
  const sequenceCounter = useRef(0);

  useEffect(() => {
    async function computeValue() {
      sequenceCounter.current++;
      const thisSequence = sequenceCounter.current;
      const result = await f();
      if (sequenceCounter.current === thisSequence) {
        setState(result);
      }
    }
    // Compute the value the first time, or when effect triggers due to function change
    computeValue();
    window.addEventListener("resize", computeValue);
    return () => window.removeEventListener("resize", computeValue);
  }, [f]);

  return state;
}
