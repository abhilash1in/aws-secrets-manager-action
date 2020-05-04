import { isJSONObject, isJSONObjectString, flattenJSONObject, filterBy } from '../src/utils'

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

test('FilterBy test', () => {
    const items = ['Banana', 'Apple', 'Melon']
    expect(filterBy(items, 'e')).toMatchObject([]);
    expect(filterBy(items, '*e')).toMatchObject(['Apple']);
    expect(filterBy(items, '*e*')).toMatchObject(['Apple', 'Melon']);
    expect(filterBy(items, 'ana')).toMatchObject([]);
    expect(filterBy(items, '*ana')).toMatchObject(['Banana']);
    expect(filterBy(items, '*an')).toMatchObject([]);
    expect(filterBy(items, '*an*')).toMatchObject(['Banana']);
});