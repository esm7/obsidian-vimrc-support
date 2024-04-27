import { MotionFn } from "./utils/defineObsidianVimMotion";
import {
  getNthNextInstanceOfPattern,
  getNthPreviousInstanceOfPattern,
} from "./utils/getNthInstanceOfPattern";

const LINK_REGEX = /\[\[[^\]\]]+?\]\]/g;

export const jumpToNextLink: MotionFn = (cm, oldPosition, { repeat }) => {
  const content = cm.getValue();
  const cursorOffset = cm.indexFromPos(oldPosition);
  const nextLinkIdx = getNthNextInstanceOfPattern({
    content,
    regex: LINK_REGEX,
    startingIdx: cursorOffset,
    n: repeat,
  });
  if (nextLinkIdx === undefined) {
    return oldPosition;
  }
  const newPosition = cm.posFromIndex(nextLinkIdx + 2);
  return newPosition;
};

export const jumpToPreviousLink: MotionFn = (cm, oldPosition, { repeat }) => {
  const content = cm.getValue();
  const cursorOffset = cm.indexFromPos(oldPosition);
  const previousLinkIdx = getNthPreviousInstanceOfPattern({
    content,
    regex: LINK_REGEX,
    startingIdx: cursorOffset,
    n: repeat,
  });
  if (previousLinkIdx === undefined) {
    return oldPosition;
  }
  const newPosition = cm.posFromIndex(previousLinkIdx + 2);
  return newPosition;
};
