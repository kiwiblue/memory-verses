// Centralized icon set. Every icon in the app goes through here by semantic
// name, so the whole icon style is controlled in one place and swapping in
// custom brand icons later (logo, streak, …) is a one-line change.
//
// Default weight is "fill" (the chosen Phosphor style). Override per-use, e.g.
// <Icon name="star" weight="regular" /> for an un-starred outline.
import {
  CaretLeft, CaretRight, CaretUp, CaretDown,
  X, Check, Star, DotsSixVertical, Plus, Question,
  Fire, Trophy, BookOpen, CalendarCheck, Confetti, Moon, Sun,
} from '@phosphor-icons/react';

const ICONS = {
  back:      CaretLeft,
  forward:   CaretRight,
  up:        CaretUp,
  down:      CaretDown,
  close:     X,
  check:     Check,
  star:      Star,
  drag:      DotsSixVertical,
  add:       Plus,
  info:      Question,
  // Brand / personality (placeholders until custom SVGs land — see Icon map)
  streak:    Fire,
  ranking:   Trophy,
  book:      BookOpen,
  calendar:  CalendarCheck,
  celebrate: Confetti,
  moon:      Moon,
  sun:       Sun,
};

export default function Icon({ name, size = 20, weight = 'fill', className, ...rest }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} weight={weight} className={className} aria-hidden="true" {...rest} />;
}
