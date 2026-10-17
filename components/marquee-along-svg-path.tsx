"use client";

import React, { useEffect, useRef } from "react";
import {
  motion,
  MotionValue,
  SpringOptions,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const wrap = (min: number, max: number, value: number): number => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

export interface MarqueeAlongSvgPathProps {
  children: React.ReactNode;
  className?: string;
  path: string;
  viewBox?: string;
  showPath?: boolean;
  baseVelocity?: number;
  direction?: "normal" | "reverse";
  slowdownOnHover?: boolean;
  slowDownFactor?: number;
  slowDownSpringConfig?: SpringOptions;
  repeat?: number;
  draggable?: boolean;
  dragSensitivity?: number;
  dragVelocityDecay?: number;
  grabCursor?: boolean;
  enableRollingZIndex?: boolean;
  zIndexBase?: number;
  zIndexRange?: number;
  /** Scale and center the whole marquee to fit the container, keeping the viewBox ratio */
  responsive?: boolean;
}

interface PathItemProps {
  baseOffset: MotionValue<number>;
  position: number;
  path: string;
  enableRollingZIndex: boolean;
  zIndexBase: number;
  zIndexRange: number;
  draggable: boolean;
  grabCursor: boolean;
  hidden: boolean;
  onHover: (hovered: boolean) => void;
  children: React.ReactNode;
}

// Each item owns its transforms, so the hooks live in a component rather than a loop
function PathItem({
  baseOffset,
  position,
  path,
  enableRollingZIndex,
  zIndexBase,
  zIndexRange,
  draggable,
  grabCursor,
  hidden,
  onHover,
  children,
}: PathItemProps) {
  const progress = useTransform(baseOffset, (v) => wrap(0, 100, v + position));
  const offsetDistance = useTransform(progress, (p) => `${p}%`);
  const zIndex = useTransform(progress, (p) =>
    Math.floor(zIndexBase + (p / 100) * zIndexRange),
  );

  return (
    <motion.div
      className={cn(
        "absolute left-0 top-0",
        draggable && grabCursor && "cursor-grab",
      )}
      style={{
        offsetPath: `path('${path}')`,
        offsetRotate: "0deg",
        offsetDistance,
        zIndex: enableRollingZIndex ? zIndex : undefined,
        willChange: "offset-distance",
        backfaceVisibility: "hidden",
      }}
      aria-hidden={hidden}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {children}
    </motion.div>
  );
}

export default function MarqueeAlongSvgPath({
  children,
  className,
  path,
  viewBox = "0 0 100 100",
  showPath = false,
  baseVelocity = 5,
  direction = "normal",
  slowdownOnHover = false,
  slowDownFactor = 0.3,
  slowDownSpringConfig = { damping: 50, stiffness: 400 },
  repeat = 3,
  draggable = false,
  dragSensitivity = 0.2,
  dragVelocityDecay = 0.96,
  grabCursor = false,
  enableRollingZIndex = true,
  zIndexBase = 1,
  zIndexRange = 10,
  responsive = false,
}: MarqueeAlongSvgPathProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const baseOffset = useMotionValue(0);
  const hoverFactor = useMotionValue(1);
  const smoothHoverFactor = useSpring(hoverFactor, slowDownSpringConfig);

  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const dragVelocity = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  const directionFactor = direction === "normal" ? 1 : -1;

  useEffect(() => {
    if (!responsive) return;
    const wrapper = containerRef.current;
    const marquee = marqueeRef.current;
    if (!wrapper || !marquee) return;

    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);
    const originalWidth = vbWidth || 100;
    const originalHeight = vbHeight || 100;

    const updateScale = () => {
      const scale = Math.min(
        wrapper.clientWidth / originalWidth,
        wrapper.clientHeight / originalHeight,
      );
      const offsetX = (wrapper.clientWidth - originalWidth * scale) / 2;
      const offsetY = (wrapper.clientHeight - originalHeight * scale) / 2;

      marquee.style.width = `${originalWidth}px`;
      marquee.style.height = `${originalHeight}px`;
      marquee.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      marquee.style.transformOrigin = "top left";
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [responsive, viewBox]);

  useAnimationFrame((_, delta) => {
    if (isDragging.current && draggable) {
      baseOffset.set(baseOffset.get() + dragVelocity.current);
      dragVelocity.current *= 0.9;
      if (Math.abs(dragVelocity.current) < 0.01) dragVelocity.current = 0;
      return;
    }

    hoverFactor.set(isHovered.current && slowdownOnHover ? slowDownFactor : 1);

    let moveBy = reducedMotion
      ? 0
      : directionFactor *
        baseVelocity *
        (delta / 1000) *
        smoothHoverFactor.get();

    if (draggable) {
      moveBy += dragVelocity.current;
      if (Math.abs(dragVelocity.current) > 0.01) {
        dragVelocity.current *= dragVelocityDecay;
      } else {
        dragVelocity.current = 0;
      }
    }

    baseOffset.set(baseOffset.get() + moveBy);
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (grabCursor) e.currentTarget.style.cursor = "grabbing";
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    dragVelocity.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || !isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    const distance = Math.hypot(dx, dy);
    dragVelocity.current = (dx > 0 ? distance : -distance) * dragSensitivity;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDragging.current = false;
    if (grabCursor) e.currentTarget.style.cursor = "grab";
  };

  const childArray = React.Children.toArray(children);
  const items = childArray.flatMap((child, childIndex) =>
    Array.from({ length: repeat }, (_, repeatIndex) => ({
      child,
      repeatIndex,
      key: `${childIndex}-${repeatIndex}`,
      itemIndex: repeatIndex * childArray.length + childIndex,
    })),
  );

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: draggable ? "pan-y" : undefined }}
      className={cn("relative", className)}
    >
      <div
        ref={marqueeRef}
        className="relative"
        style={{ contain: "layout style" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={viewBox}
          aria-hidden="true"
          className="h-full w-full"
        >
          <path
            d={path}
            stroke={showPath ? "currentColor" : "none"}
            fill="none"
          />
        </svg>

        {items.map(({ child, key, repeatIndex, itemIndex }) => (
          <PathItem
            key={key}
            baseOffset={baseOffset}
            position={(itemIndex * 100) / items.length}
            path={path}
            enableRollingZIndex={enableRollingZIndex}
            zIndexBase={zIndexBase}
            zIndexRange={zIndexRange}
            draggable={draggable}
            grabCursor={grabCursor}
            hidden={repeatIndex > 0}
            onHover={(hovered) => (isHovered.current = hovered)}
          >
            {child}
          </PathItem>
        ))}
      </div>
    </div>
  );
}
