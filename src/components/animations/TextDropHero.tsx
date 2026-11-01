import { motion, useReducedMotion } from 'framer-motion';

interface Props { text: string; className?: string; baseDelay?: number }

/** Letter-by-letter spring drop-in. Screen readers get the full text via aria-label. */
export default function TextDropHero({ text, className = '', baseDelay = 0.15 }: Props) {
  const reduce = useReducedMotion();
  let index = 0;
  return (
    <h1 aria-label={text} className={className}>
      {text.split(' ').map((word, w) => (
        <span key={w} aria-hidden className="mr-[0.28em] inline-block whitespace-nowrap">
          {word.split('').map((ch) => {
            const i = index++;
            return (
              <motion.span
                key={i}
                className="inline-block"
                initial={reduce ? false : { y: -90, opacity: 0, rotate: -8 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14, mass: 0.7, delay: baseDelay + i * 0.035 }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
