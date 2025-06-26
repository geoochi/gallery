import React, { useEffect, useRef, ReactNode, CSSProperties } from 'react'

interface SpringOptions {
  stiffness: number
  damping: number
}

interface TiltProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  rotationFactor?: number
  isRevese?: boolean
  springOptions?: SpringOptions
}

export function Tilt({
  children,
  className,
  style,
  rotationFactor = 15,
  isRevese = false,
  springOptions = { stiffness: 0.15, damping: 0.8 },
}: TiltProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | undefined>(undefined)

  const rotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const resetRotation = () => {
      targetRotationRef.current = { x: 0, y: 0 }
    }

    const calculateTargetRotation = (e: MouseEvent) => {
      if (!elementRef.current) return

      const rect = elementRef.current.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const normalizedX = mouseX / width - 0.5
      const normalizedY = mouseY / height - 0.5

      targetRotationRef.current = {
        x: isRevese ? -normalizedY * rotationFactor : normalizedY * rotationFactor,
        y: isRevese ? normalizedX * rotationFactor : -normalizedX * rotationFactor,
      }
    }

    const animateSpring = (time: number) => {
      if (previousTimeRef.current === undefined) {
        previousTimeRef.current = time
      }

      const deltaTime = Math.min((time - previousTimeRef.current) / 1000, 0.1)
      previousTimeRef.current = time

      const axes: ('x' | 'y')[] = ['x', 'y']
      let stillMoving = false

      axes.forEach(axis => {
        const displacement = rotationRef.current[axis] - targetRotationRef.current[axis]
        const springForce = -springOptions.stiffness * displacement
        const dampingForce = -springOptions.damping * velocityRef.current[axis]
        const force = springForce + dampingForce

        velocityRef.current[axis] += force * deltaTime

        rotationRef.current[axis] += velocityRef.current[axis] * deltaTime

        if (Math.abs(displacement) > 0.01 || Math.abs(velocityRef.current[axis]) > 0.01) {
          stillMoving = true
        }
      })

      if (elementRef.current) {
        elementRef.current.style.transform = `perspective(1000px) rotateX(${rotationRef.current.x}deg) rotateY(${rotationRef.current.y}deg)`
      }

      if (stillMoving) {
        requestRef.current = requestAnimationFrame(animateSpring)
      } else {
        requestRef.current = null
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      calculateTargetRotation(e)

      if (!requestRef.current) {
        previousTimeRef.current = undefined
        requestRef.current = requestAnimationFrame(animateSpring)
      }
    }

    const handleMouseLeave = () => {
      resetRotation()

      if (!requestRef.current) {
        previousTimeRef.current = undefined
        requestRef.current = requestAnimationFrame(animateSpring)
      }
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [rotationFactor, isRevese, springOptions.stiffness, springOptions.damping])

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        transition: 'transform 0s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default Tilt
