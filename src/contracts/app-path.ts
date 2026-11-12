/** A path of this application, under the base path it is deployed at. */
export function appPath(path = "") {
  return `${import.meta.env.BASE_URL}${path}`;
}

/** Where a published story serves one of its files (a bundle, the project, media). */
export function storyFileUrl(storyId: string, path: string) {
  return appPath(`stories/${storyId}/${path}`);
}
