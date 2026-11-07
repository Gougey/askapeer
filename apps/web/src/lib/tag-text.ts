/**
 * How a tag reads on screen: "Foot (muscles)".
 *
 * 83 tag names are shared by more than one tag, and without the label two different tags read
 * identically, so a member cannot tell why picking "Foot" found nothing. Display only: `name`
 * is what the classifier matches and what search folds in. A plain module, importable from
 * server and client alike.
 */
export function tagText(tag: { name: string; label?: string | null }): string {
  return tag.label ? `${tag.name} (${tag.label})` : tag.name;
}
