import { createStore } from '../../lib/store';
import { EMPTY_FILTERS, type FeedFilters } from './api';

export const feedFilters = createStore<FeedFilters>(EMPTY_FILTERS);

/** Venue chosen in the plan/venue sheet, read by the create-plan form. */
export const pickedVenue = createStore<string | null>(null);

export const activeFilterCount = (f: FeedFilters) => [f.area, f.audience, f.day].filter(Boolean).length;
