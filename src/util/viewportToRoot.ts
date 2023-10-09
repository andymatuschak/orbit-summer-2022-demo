export function getScrollingContainer(): Element {
  const rootNode = document.getElementById("demo-root")!;
  const regex = /(auto|scroll)/;
  const parents = (_node: Node | null, ps: Node[]): Node[] => {
    if (!_node) return ps;
    return parents(_node.parentNode, ps.concat([_node]));
  };

  const style = (_node: Element, prop: string) =>
    getComputedStyle(_node, null).getPropertyValue(prop);
  const overflow = (_node: Element) =>
    style(_node, "overflow") +
    style(_node, "overflow-y") +
    style(_node, "overflow-x");
  const scroll = (_node: Element) => regex.test(overflow(_node));

  const scrollParent = (_node: Element): Element => {
    const ps = parents(_node.parentNode, []);

    for (let i = 0; i < ps.length; i += 1) {
      const parent = ps[i];
      if (!(parent instanceof HTMLElement)) {
        continue;
      }
      if (scroll(parent)) {
        return parent;
      }
    }

    return document.scrollingElement || document.documentElement;
  };

  return scrollParent(rootNode);
}

export function viewportToRoot() {
  const scrollParent = getScrollingContainer();
  const parentBounds = scrollParent.getBoundingClientRect();
  return {
    x: scrollParent.scrollLeft - parentBounds.left,
    y: scrollParent.scrollTop - parentBounds.top,
  };
}
