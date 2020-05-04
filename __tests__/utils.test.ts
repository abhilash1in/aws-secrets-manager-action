import { isJSONObject, isJSONObjectString, flattenJSONObject } from '../src/utils'

test('Invaid JSON object string test 1', () => {
    expect(isJSONObjectString('["abcd"]')).toBe(false);
});

test('Invaid JSON object string test 2', () => {
    expect(isJSONObjectString('100')).toBe(false);
});

test('Valid JSON object string test', () => {
    expect(isJSONObjectString('{"foo": "bar"}')).toBe(true);
});

test('Invaid JSON object', () => {
    expect(isJSONObject(["foo", "bar", "baz"])).toBe(false);
});

test('Valid JSON object', () => {
    expect(isJSONObject({"foo": {"bar": "baz"}})).toBe(true);
});

test('Valid JSON object string test', () => {
    expect(flattenJSONObject({"foo": {"bar": "baz"}})).toMatchObject({"foo.bar": "baz"});
});