"use client";

import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => {
    const classes = `rounded-xl border bg-card text-card-foreground shadow ${className}`;
    return <div ref={ref} className={classes} {...props} />;
  }
);

Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = "", ...props }, ref) => {
    const classes = `p-6 pt-0 ${className}`;
    return <div ref={ref} className={classes} {...props} />;
  }
);

CardContent.displayName = "CardContent";

export { Card, CardContent };