declare const Bun: {
  serve: (options: {
    port: number;
    fetch: (request: Request) => Promise<Response>;
  }) => {
    port: number;
  };
};