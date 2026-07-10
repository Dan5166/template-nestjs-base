import { HttpAdapterHost } from '@nestjs/core';
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter — error reporting', () => {
  let reply: jest.Mock;
  let report: jest.Mock;
  let filter: AllExceptionsFilter;

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/orders', method: 'POST', headers: {} }),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    reply = jest.fn();
    report = jest.fn();
    const adapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost;
    filter = new AllExceptionsFilter(adapterHost, { report });
  });

  it('reports server (5xx) errors to the reporter', () => {
    filter.catch(new Error('boom'), host);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ method: 'POST', path: '/orders', statusCode: 500 }),
    );
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.anything(), 500);
  });

  it('does not report client (4xx) errors', () => {
    filter.catch(new NotFoundException('nope'), host);

    expect(report).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.anything(), 404);
  });

  it('still returns a response when the reporter throws', () => {
    report.mockImplementation(() => {
      throw new Error('reporter down');
    });

    expect(() => filter.catch(new Error('boom'), host)).not.toThrow();
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.anything(), 500);
  });
});
