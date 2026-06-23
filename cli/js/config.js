// Configuration constants and file-system node shape helpers for the Terminal Portfolio.
// Pure data + helpers, no DOM access. Loaded as an ES module ("type": "module").

/**
 * Application configuration constants.
 *
 * CV_LINK is a PLACEHOLDER Google Drive URL (Req 9.3) defined as a single
 * configurable value so the final CV document can be swapped without touching
 * command logic.
 */
export const CONFIG = {
  // PLACEHOLDER — replace with the final CV document URL (Req 9.3).
  CV_LINK: 'https://drive.google.com/file/d/1vNO205Riloci_fWHuIa0xx489Xla1Hw8/view',
  // Full graphical portfolio website (escape hatch for non-terminal visitors).
  GUI_LINK: 'https://rohitgunthal.is-a.dev/',
  OWNER_EMAIL: 'rohitgunthal1819@gmail.com',
  HOME: 'Portfolio~',
  PROMPT_USER: 'visitor',
  PROMPT_HOST: 'portfolio',
};

/**
 * Create a file node.
 *
 * The node's `name` is assigned by its parent (the key in the parent
 * directory's `children` map, or by `dir`), so `file` only takes the content.
 *
 * @param {string} content - The textual content stored in the file.
 * @returns {{ type: 'file', content: string }} A file node.
 */
export function file(content) {
  return { type: 'file', content };
}

/**
 * Create a directory node.
 *
 * @param {string} name - The directory's name.
 * @param {{ [name: string]: object }} [children] - Child nodes keyed by name.
 * @returns {{ type: 'dir', name: string, children: object }} A directory node.
 */
export function dir(name, children = {}) {
  return { type: 'dir', name, children };
}
