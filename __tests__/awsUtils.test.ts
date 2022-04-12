import { constructSecretName, deconstructSecretName, getSecretValueMaps, getSecretNamesToFetch } from '../src/awsUtils'
import { SecretsManager } from 'aws-sdk'
import { resolve } from 'path'
import { config } from 'dotenv'

jest.mock('aws-sdk')

config({ path: resolve(__dirname, '../.env') })

const NO_PREFIXED_EXPECTED = {'my_secret_1': 'test-value-1', 'my_secret_2_foo': 'bar', 'my/secret/3_foo': 'bar'}
const PREFIXED_EXPECTED = {'my_prefixed_1': 'prefixed-test-value-1', 'my_prefixed_2_foo': 'bar', 'my/prefixed/3_foo': 'bar'}

const secretsManagerClient = new SecretsManager({})

test ('Construct secret name: with secretPrefix', () => {
  expect(constructSecretName('secret123', 'pref1')).toEqual('pref1/secret123')
  expect(constructSecretName('secret123', 'pref1/teamA')).toEqual('pref1/teamA/secret123')
  expect(constructSecretName('super/secret123', 'pref1')).toEqual('pref1/super/secret123')
  expect(constructSecretName('super/secret123', 'pref1/teamA')).toEqual('pref1/teamA/super/secret123')
})

test ('Construct secret name: without secretPrefix', () => {
  expect(constructSecretName('secret123')).toEqual('secret123')
  expect(constructSecretName('secret123', '')).toEqual('secret123')
  expect(constructSecretName('secret123', undefined)).toEqual('secret123')
})

test ('Deconstruct secret name: with secretPrefix', () => {
  expect(deconstructSecretName('pref1/secret123', 'pref1')).toEqual('secret123')
  expect(deconstructSecretName('pref1/teamA/secret123', 'pref1/teamA')).toEqual('secret123')
  expect(deconstructSecretName('pref1/super/secret123', 'pref1')).toEqual('super/secret123')
  expect(deconstructSecretName('pref1/teamA/super/secret123', 'pref1/teamA')).toEqual('super/secret123')
})

test ('Deconstruct secret name: without secretPrefix', () => {
  expect(deconstructSecretName('secret123')).toEqual('secret123')
  expect(deconstructSecretName('secret123', '')).toEqual('secret123')
  expect(deconstructSecretName('secret123', undefined)).toEqual('secret123')
})

test('Get Secret Names To Fetch: Exact Name with secretPrefix', () => {
  expect.assertions(1)
  return getSecretNamesToFetch(secretsManagerClient, ['my/prefixed/3'], 'dev').then(secretNames => {
    expect(secretNames).toEqual(['dev/my/prefixed/3'])
  })
})

test('Get Secret Names To Fetch: Single Wild Card Name with secretPrefix', () => {
  expect.assertions(1)
  return getSecretNamesToFetch(secretsManagerClient, ['*prefixed*'], 'dev').then(secretNames => {
    expect(secretNames.sort()).toEqual(['dev/my_prefixed_1', 'dev/my_prefixed_2', 'dev/my/prefixed/3'].sort())
  })
})

test('Get Secret Names To Fetch: Multiple Wild Card Names with secretPrefix', () => {
  expect.assertions(1)
  return getSecretNamesToFetch(secretsManagerClient, ['my*', 'my_prefixed*', 'invalid'], 'dev')
    .then(secretNames => {
      expect(secretNames.sort()).toEqual(['dev/my_prefixed_1', 'dev/my_prefixed_2', 'dev/my/prefixed/3'].sort())
    })
})

test('Get Secret Value Maps: Single Secret without secretPrefix', () => {
  return getSecretValueMaps(secretsManagerClient, ['my_secret_1'], false).then(maps =>
    expect(maps).toEqual({'my_secret_1': 'test-value-1'})
  )
})

test('Get Secret Value Maps: Multiple Secrets without secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['my_secret_1', 'my_secret_2', 'my/secret/3'], true)
    .then(maps => expect(maps).toEqual(NO_PREFIXED_EXPECTED))
})

test('Get Secret Value Maps: Single Wild Card Name without secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['*secret*'], true).then(maps =>
    expect(maps).toEqual(NO_PREFIXED_EXPECTED))
})

test('Get Secret Value Maps: Multiple Wild Card Name without secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['my*', 'my_prefixed*', 'invalid'], true).then(maps =>
    expect(maps).toEqual(NO_PREFIXED_EXPECTED))
})

test('Get Secret Value Maps: Single Secret with secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['my_prefixed_1'], false, 'dev').then(maps =>
    expect(maps).toEqual({'my_prefixed_1': 'prefixed-test-value-1'})
  )
})

test('Get Secret Value Maps: Multiple Secrets with secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['my_prefixed_1', 'my_prefixed_2', 'my/prefixed/3'], true, 'dev')
    .then(maps => expect(maps).toEqual(PREFIXED_EXPECTED))
})

test('Get Secret Value Maps: Single Wild Card Name with secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['*prefixed*'], true, 'dev').then(maps => 
    expect(maps).toEqual(PREFIXED_EXPECTED))
})

test('Get Secret Value Maps: Multiple Wild Card Name with secretPrefix', () => {
  expect.assertions(1)
  return getSecretValueMaps(secretsManagerClient, ['my*', 'my_prefixed*', 'invalid'], true, 'dev')
    .then(maps => expect(maps).toEqual(PREFIXED_EXPECTED))
})
