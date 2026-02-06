import { useFilterStore } from '@/lib/store';
import { act } from '@testing-library/react';

describe('useFilterStore', () => {
  beforeEach(() => {
    // Reset store between tests
    const { reset } = useFilterStore.getState();
    reset();
  });

  it('has correct initial state', () => {
    const state = useFilterStore.getState();
    expect(state.repo).toBeUndefined();
    expect(state.search).toBe('');
    expect(state.status).toBeUndefined();
    expect(state.priority).toBeUndefined();
  });

  it('sets repo filter', () => {
    act(() => {
      useFilterStore.getState().setRepo('owner/repo');
    });
    expect(useFilterStore.getState().repo).toBe('owner/repo');
  });

  it('sets search filter', () => {
    act(() => {
      useFilterStore.getState().setSearch('test query');
    });
    expect(useFilterStore.getState().search).toBe('test query');
  });

  it('sets status filter', () => {
    act(() => {
      useFilterStore.getState().setStatus('todo');
    });
    expect(useFilterStore.getState().status).toBe('todo');
  });

  it('sets priority filter', () => {
    act(() => {
      useFilterStore.getState().setPriority('high');
    });
    expect(useFilterStore.getState().priority).toBe('high');
  });

  it('resets all filters', () => {
    act(() => {
      const state = useFilterStore.getState();
      state.setRepo('owner/repo');
      state.setSearch('query');
      state.setStatus('todo');
      state.setPriority('high');
    });
    act(() => {
      useFilterStore.getState().reset();
    });
    const state = useFilterStore.getState();
    expect(state.repo).toBeUndefined();
    expect(state.search).toBe('');
    expect(state.status).toBeUndefined();
    expect(state.priority).toBeUndefined();
  });
});
