import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { colors, radii, tapTargets } from '@/app/theme'

type Variant = 'primary' | 'secondary'
type Size = 'normal' | 'large'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const sizes: Record<Size, { minWidth: number; minHeight: number; fontSize: number; paddingX: number }> = {
  normal: { minWidth: tapTargets.minSize, minHeight: tapTargets.minSize, fontSize: 20, paddingX: 20 },
  large: { minWidth: 120, minHeight: 96, fontSize: 28, paddingX: 32 },
}

const variants: Record<Variant, { background: string; color: string; border: string }> = {
  primary: {
    background: colors.accentBlue,
    color: '#ffffff',
    border: `2px solid ${colors.accentBlue}`,
  },
  secondary: {
    background: '#ffffff',
    color: colors.text,
    border: `2px solid ${colors.accentBlue}`,
  },
}

export function Button({
  variant = 'primary',
  size = 'normal',
  style,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sz = sizes[size]
  const va = variants[variant]
  return (
    <button
      type={type}
      style={{
        minWidth: sz.minWidth,
        minHeight: sz.minHeight,
        fontSize: sz.fontSize,
        paddingInline: sz.paddingX,
        borderRadius: radii.kid,
        background: va.background,
        color: va.color,
        border: va.border,
        cursor: 'pointer',
        fontWeight: 600,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
