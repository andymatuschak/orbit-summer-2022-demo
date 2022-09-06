import { useEffect, useRef, useState } from "react";

// Returns the result of f, computed on the first call and recomputed whenever the window changes size.
export function useLayoutDependentValue<T>(f: () => T): T {
  const [state, setState] = useState<T>(f());

  useEffect(() => {
    function onResize() {
      setState(f());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [f]);

  return state;
}

// Returns the result of f, computed on the first call and recomputed whenever the window changes size.
export function useAsyncLayoutDependentValue<T>(
  initialValue: T,
  f: () => Promise<T>,
): T {
  const [state, setState] = useState<T>(initialValue);
  const sequenceCounter = useRef(0);

  useEffect(() => {
    async function onResize() {
      sequenceCounter.current++;
      const thisSequence = sequenceCounter.current;
      const result = await f();
      if (sequenceCounter.current === thisSequence) {
        setState(result);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [f]);

  return state;
}
