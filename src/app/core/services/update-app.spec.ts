import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { UpdateApp } from './update-app';
import { Version } from './version';

const swUpdateMock = {
  isEnabled: false,
  versionUpdates: { pipe: () => ({ subscribe: () => {} }) },
  unrecoverable: { subscribe: () => {} },
  checkForUpdate: vi.fn().mockResolvedValue(false),
  activateUpdate: vi.fn().mockResolvedValue(undefined),
};

const versionMock = {
  getVersionInfo: vi.fn().mockResolvedValue({
    version: '1.0.0',
    environment: 'production',
    commit: null,
    history: []
  })
};

describe('UpdateApp', () => {
  let service: UpdateApp;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        UpdateApp,
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: Version, useValue: versionMock }
      ]
    });
    service = TestBed.inject(UpdateApp);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false when SW is disabled', async () => {
    swUpdateMock.isEnabled = false;
    const result = await service.checkForUpdate();
    expect(result).toBe(false);
  });

  it('should call checkForUpdate when SW is enabled', async () => {
    swUpdateMock.isEnabled = true;
    await service.checkForUpdate();
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('should return false when checkForUpdate throws', async () => {
    swUpdateMock.isEnabled = true;
    swUpdateMock.checkForUpdate.mockRejectedValue(new Error('fail'));
    const result = await service.checkForUpdate();
    expect(result).toBe(false);
  });

  it('execute should return early when SW is disabled', async () => {
    swUpdateMock.isEnabled = false;
    await service.execute();
    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
  });
});