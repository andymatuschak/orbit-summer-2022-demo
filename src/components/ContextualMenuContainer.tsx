import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import ContextualMenu, { ContextualMenuProps } from "./ContextualMenu";

interface ContextualMenuContainerProps extends ContextualMenuProps {
  menuIsOpen: boolean;
  shouldClose?: (event: MouseEvent) => boolean;
  setMenuIsOpen: Dispatch<SetStateAction<boolean>>;
  openerRef: React.MutableRefObject<HTMLElement>;
}

export function ContextualMenuContainer(props: ContextualMenuContainerProps) {
  const { menuIsOpen, setMenuIsOpen, shouldClose, openerRef, ...menuProps } =
    props;
  const [position, setPosition] = useState<[right: number, top: number] | null>(
    null
  );

  useEffect(() => {
    if (!menuIsOpen || !openerRef.current) return;

    function onClick(event: MouseEvent) {
      if (
        (shouldClose?.(event) ?? true) &&
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuIsOpen(false);
      }
    }

    // Assuming this node is a sibling to the opener inside some positioned element
    const openerRect = openerRef.current.getBoundingClientRect();
    let right =
      openerRef.current.offsetParent!.clientWidth -
      openerRef.current.offsetLeft -
      openerRect.width +
      5;
    let top = openerRef.current.offsetTop + openerRect.height;
    setPosition([right, top]);

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuIsOpen]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      css={[
        {
          position: "absolute",
          transition: "var(--fade-transition)",
        },
        menuIsOpen ? { opacity: 1 } : { opacity: 0, pointerEvents: "none" },
        position && { right: `${position[0]}px`, top: `${position[1]}px` },
      ]}
      ref={menuRef}
    >
      <ContextualMenu {...menuProps} />
    </div>
  );
}
