/**
 * Page-side: which of a fiber's two copies is in the tree on screen. React
 * keeps two per component and swaps them on each update, but an element's
 * `__reactFiber$` key keeps the one it was created with, and a fiber whose
 * subtree was skipped keeps a `return` to its parent's old copy. This is React
 * DevTools' `findCurrentFiberUsingSlowPath`: walk both copies up until a parent
 * lists one of them as its child, and at the root ask which copy is current.
 */
export const REACT_CURRENT_JS = `
  const HOST_ROOT_TAG = 3;
  const childOf = (parent, a, b) => {
    for (let child = parent.child; child; child = child.sibling) {
      if (child === a) return a;
      if (child === b) return b;
    }
    return null;
  };
  const currentFiber = (fiber) => {
    const alternate = fiber.alternate;
    if (!alternate) return fiber;
    let a = fiber;
    let b = alternate;
    for (;;) {
      const parentA = a.return;
      if (!parentA) break;
      const parentB = parentA.alternate;
      if (!parentB) {
        if (!parentA.return) break;
        a = b = parentA.return;
        continue;
      }
      if (parentA.child === parentB.child) {
        return childOf(parentA, a, b) === b ? alternate : fiber;
      }
      if (a.return !== b.return) {
        a = parentA;
        b = parentB;
        continue;
      }
      // Both copies hang from the same parent: whichever of its copies lists one of them leads on.
      const inA = childOf(parentA, a, b);
      const inB = inA ? null : childOf(parentB, a, b);
      if (inA === a || inB === b) [a, b] = [parentA, parentB];
      else if (inA === b || inB === a) [a, b] = [parentB, parentA];
      else return fiber;
    }
    return a.tag === HOST_ROOT_TAG && a.stateNode && a.stateNode.current !== a ? alternate : fiber;
  };
  // A fiber's parent, as on screen.
  const up = (fiber) => (fiber.return ? currentFiber(fiber.return) : null);
`;
