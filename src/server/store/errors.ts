/** An error the user should see, with the HTTP status the route should return. */
export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new StoreError(`${what} not found`, 404);
