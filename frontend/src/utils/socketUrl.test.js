import { getSocketServerUrl } from "./socketUrl";

describe("getSocketServerUrl", () => {
  test("removes the API prefix from a production API URL", () => {
    expect(getSocketServerUrl("https://api.matrix-delivery.com/api")).toBe(
      "https://api.matrix-delivery.com",
    );
  });

  test("removes a trailing slash from the API prefix", () => {
    expect(getSocketServerUrl("https://api.matrix-delivery.com/api/")).toBe(
      "https://api.matrix-delivery.com",
    );
  });

  test("removes the API prefix from the local development URL", () => {
    expect(getSocketServerUrl("http://localhost:5000/api")).toBe(
      "http://localhost:5000",
    );
  });

  test("preserves an origin that does not include an API prefix", () => {
    expect(getSocketServerUrl("http://localhost:5000")).toBe(
      "http://localhost:5000",
    );
  });

  test("strips query strings and fragments from the socket origin", () => {
    expect(
      getSocketServerUrl("https://api.matrix-delivery.com/api?source=test#app"),
    ).toBe("https://api.matrix-delivery.com");
  });

  test("uses the local API origin by default", () => {
    expect(getSocketServerUrl()).toBe("http://localhost:5000");
  });
});
