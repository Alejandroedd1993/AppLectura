// Mock simple para framer-motion
const React = require('react');

const createMotionComponent = (tag) => {
  return React.forwardRef((props, ref) => {
    const { animate, initial, exit, transition, whileHover, whileTap, variants, ...otherProps } = props;
    return React.createElement(tag, { ...otherProps, ref });
  });
};

module.exports = {
  motion: {
    div: createMotionComponent('div'),
    span: createMotionComponent('span'), 
    p: createMotionComponent('p'),
    h1: createMotionComponent('h1'),
    h2: createMotionComponent('h2'),
    h3: createMotionComponent('h3'),
    button: createMotionComponent('button'),
    section: createMotionComponent('section'),
    article: createMotionComponent('article'),
    nav: createMotionComponent('nav'),
    header: createMotionComponent('header'),
    footer: createMotionComponent('footer'),
    aside: createMotionComponent('aside'),
    main: createMotionComponent('main'),
    ul: createMotionComponent('ul'),
    ol: createMotionComponent('ol'),
    li: createMotionComponent('li'),
    a: createMotionComponent('a'),
    img: createMotionComponent('img'),
    form: createMotionComponent('form'),
    input: createMotionComponent('input'),
    textarea: createMotionComponent('textarea'),
    select: createMotionComponent('select'),
    label: createMotionComponent('label'),
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useMotionValue: () => ({
    get: () => 0,
    set: jest.fn(),
  }),
};
