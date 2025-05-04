/**
 * Represents a school board with its name and a unique identifier.
 */
export interface SchoolBoard {
  /**
   * The unique identifier for the school board.
   */
  id: string;
  /**
   * The name of the school board (e.g., CBSE, ICSE, GCSE, IB).
   */
  name: string;
}

/**
 * Asynchronously retrieves a list of supported school boards.
 *
 * @returns A promise that resolves to an array of SchoolBoard objects.
 */
export async function getSchoolBoards(): Promise<SchoolBoard[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: 'cbse',
      name: 'CBSE',
    },
    {
      id: 'icse',
      name: 'ICSE',
    },
    {
      id: 'gcse',
      name: 'GCSE',
    },
    {
      id: 'ib',
      name: 'IB',
    },
  ];
}
