import { NomineeService } from '../nomineeService';
import { http } from '../http';

jest.mock('../http', () => {
  const postMock = jest.fn();
  const getMock = jest.fn();
  return {
    http: {
      post: postMock,
      get: getMock,
    },
  };
});

const postMock = jest.mocked(http.post);

describe('NomineeService.calculateAguinaldo', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('sends employeeIds and dates to the backend and returns the payload', async () => {
    const fakeResponse = [{ employeeId: 1, aguinaldo: 250, message: 'OK' }];
    postMock.mockResolvedValue(fakeResponse);

    const employeeIds = [1, 2, 3];
    const startDate = '2025-12-01';
    const endDate = '2026-12-01';

    const result = await NomineeService.calculateAguinaldo(
      employeeIds,
      startDate,
      endDate,
    );

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/nominee/calculate-aguinaldo', {
      employeeIds,
      start_date: startDate,
      end_date: endDate,
    });
    expect(result).toEqual(fakeResponse);
  });

  it('throws a friendly error message on failure', async () => {
    postMock.mockRejectedValue(new Error('boom'));

    await expect(
      NomineeService.calculateAguinaldo([1], '2025-12-01', '2026-12-01'),
    ).rejects.toThrow('boom');
  });
});
