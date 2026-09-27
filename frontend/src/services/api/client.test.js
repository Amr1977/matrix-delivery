describe('AuthApi login API URL', () => {
  const originalApiUrl = process.env.REACT_APP_API_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.REACT_APP_API_URL;
    } else {
      process.env.REACT_APP_API_URL = originalApiUrl;
    }
    global.fetch = originalFetch;
    jest.resetModules();
  });

  it('uses the production API when no API URL is configured', async () => {
    delete process.env.REACT_APP_API_URL;
    jest.resetModules();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ csrfToken: 'csrf-test-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
      });

    let AuthApi;
    jest.isolateModules(() => {
      AuthApi = require('./auth').AuthApi;
    });

    await AuthApi.login({ email: 'user@example.com', password: 'password' });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.matrix-delivery.com/api/csrf-token',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.matrix-delivery.com/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-test-token' }),
      }),
    );
  });
});
