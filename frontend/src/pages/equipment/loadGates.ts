/** Separate request generations so an archived load cannot cancel the main list load. */
export function createLoadGates() {
  let list = 0;
  let archived = 0;
  return {
    beginList() {
      list += 1;
      return list;
    },
    isCurrentList(id: number) {
      return id === list;
    },
    beginArchived() {
      archived += 1;
      return archived;
    },
    isCurrentArchived(id: number) {
      return id === archived;
    },
  };
}
