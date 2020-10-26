import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePopper } from 'react-popper';
import { Placement } from '@popperjs/core/lib/enums';

const popperOptions = {
  modifiers: [
    {
      name: 'preventOverflow',
      options: {
        // Prevents dialogs from moving elements to the side
        boundary: document.body,
        altAxis: true,
        padding: 8,
      },
    },
  ],
};

interface IFlyout {
  open: boolean;
  label?: string;
  labelledby?: string;
  describedby?: string;
  target: React.ReactElement<HTMLElement>;
  /** The popover content. */
  children: React.ReactNode;
  className?: string;
  onClose?: (event: Event) => void;
  /** If no event listener is provided for the cancel event, by default closing
   *  with the Escape key will be disabled. This is to ensure that the passed
   * state valid.  */
  onCancel?: (event: Event) => void;
  placement?: Placement;
  /** Flip modifier settings */
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

const Flyout = (props: IFlyout) => {
  const {
    open,
    label,
    labelledby,
    describedby,
    className,
    onClose,
    onCancel,
    target,
    children,
    placement,
    fallbackPlacements,
    allowedAutoPlacements,
  } = props;

  const dialog = useRef<HTMLDialogElement>(null);
  const options = useRef({
    ...popperOptions,
    placement,
    modifiers: [{ name: 'flips', options: { fallbackPlacements, allowedAutoPlacements } }],
  });

  const { styles, attributes, forceUpdate } = usePopper(
    dialog.current?.previousElementSibling,
    dialog.current,
    options.current,
  );

  // Focus first focusable element
  useEffect(() => {
    if (dialog.current && open) {
      forceUpdate?.();
    }
  }, [open, forceUpdate]);

  // Add event listeners because React does not have proper typings :)
  useEffect(() => {
    const element = dialog.current;
    if (onClose) {
      element?.addEventListener('close', onClose);
    }
    const cancel = onCancel ?? ((e: Event) => e.preventDefault());
    element?.addEventListener('cancel', cancel);

    return () => {
      if (onClose) {
        element?.removeEventListener('close', onClose);
      }
      element?.removeEventListener('cancel', cancel);
    };
  }, [onClose, onCancel]);

  return (
    <>
      {target}
      <dialog
        style={styles.popper}
        {...attributes.popper}
        open={open}
        data-flyout
        ref={dialog}
        aria-label={label}
        aria-labelledby={labelledby}
        aria-describedby={describedby}
        className={className}
      >
        {children}
      </dialog>
    </>
  );
};

interface ITooltip {
  content: React.ReactNode;
  children: React.ReactElement<HTMLElement>;
  /** @default 100 */
  hoverDelay?: number;
  /** @default 'auto' */
  placement?: Placement;
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

const Tooltip = (props: ITooltip) => {
  const {
    content,
    children,
    hoverDelay = 100,
    placement = 'auto',
    allowedAutoPlacements,
    fallbackPlacements,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const timerID = useRef<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const options = useRef({
    ...popperOptions,
    placement,
    modifiers: [{ name: 'flips', options: { fallbackPlacements, allowedAutoPlacements } }],
  });

  const { styles, attributes, forceUpdate } = usePopper(
    dialog.current?.previousElementSibling,
    dialog.current,
    options.current,
  );

  const handleMouseEnter = useCallback(() => {
    timerID.current = (setTimeout(() => {
      setIsOpen(true);
      forceUpdate?.();
    }, hoverDelay) as unknown) as number;
  }, [hoverDelay, forceUpdate]);

  const handleMouseLeave = useCallback(() => {
    if (timerID.current) {
      clearTimeout(timerID.current);
      timerID.current = undefined;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    let trigger: HTMLElement;
    if (dialog.current && dialog.current.previousElementSibling) {
      trigger = dialog.current.previousElementSibling as HTMLElement;
      trigger.addEventListener('mouseenter', handleMouseEnter);
      trigger.addEventListener('mouseleave', handleMouseLeave);
    }

    // Clear timer on removing component
    return () => {
      if (timerID.current) {
        clearTimeout(timerID.current);
        timerID.current = undefined;
      }
      trigger?.removeEventListener('mouseenter', handleMouseEnter);
      trigger?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseEnter, handleMouseLeave]);

  return (
    <>
      {children}
      <dialog style={styles.popper} {...attributes.popper} open={isOpen} data-tooltip ref={dialog}>
        <div role="tooltip" className="tooltip">
          {content}
        </div>
      </dialog>
    </>
  );
};

interface IContextMenu {
  open: boolean;
  x: number;
  y: number;
  /** The element must be a Menu component otherwise focus will not work. */
  children: React.ReactFragment | React.ReactElement;
  onClose: (event: Event) => void;
}

const ContextMenu = ({ open, x, y, children, onClose }: IContextMenu) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const boundingRect = useRef({
    width: 0,
    height: 0,
    top: y,
    right: x,
    bottom: y,
    left: x,
  });
  const virtualElement = useRef({ getBoundingClientRect: () => boundingRect.current });
  const options = useRef({ ...popperOptions, placement: 'right-start' as Placement });

  const { styles, attributes, forceUpdate } = usePopper(
    virtualElement.current,
    dialog.current,
    options.current,
  );

  // Add event listeners because React does not have proper typings :)
  useEffect(() => {
    const element = dialog.current;
    element?.addEventListener('close', onClose);
    const cancel = (e: Event) => e.preventDefault();
    element?.addEventListener('cancel', cancel);

    return () => {
      element?.removeEventListener('close', onClose);
      element?.removeEventListener('cancel', cancel);
    };
  }, [onClose]);

  useEffect(() => {
    if (dialog.current && open) {
      // CLose all other dialogs just in case.
      document.querySelectorAll('dialog[open][data-contextmenu]').forEach((d) => {
        if (d !== dialog.current) {
          (d as HTMLDialogElement).close();
        }
      });
      const r = boundingRect.current;
      r.top = y;
      r.right = x;
      r.bottom = y;
      r.left = x;
      forceUpdate?.();
      // Focus first focusable menu item
      const first = dialog.current.querySelector('[role^="menuitem"]') as HTMLElement;
      // The Menu component will handle setting the tab indices.
      first?.focus();
    }
  }, [open, forceUpdate, x, y]);

  return (
    <dialog style={styles.popper} {...attributes.popper} open={open} data-contextmenu ref={dialog}>
      {children}
    </dialog>
  );
};

export { ContextMenu, Flyout, Tooltip };