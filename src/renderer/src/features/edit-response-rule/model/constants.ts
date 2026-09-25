import { ANY_METHOD } from '@common/overrides';

/** The methods the method menu offers (a request's own method is offered too when it isn't one of them). */
export const METHOD_CHOICES: readonly string[] = [ANY_METHOD, 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** What a number field accepts as it is typed: digits only. */
export const DIGITS = /^\d*$/;
