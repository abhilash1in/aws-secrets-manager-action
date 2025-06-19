import { getSecretValue, listSecrets, getSecretValueMap, getSecretNamesToFetch } from '../src/awsUtils'
import { SecretsManager } from 'aws-sdk'
import { resolve } from 'path'
import { config } from 'dotenv'

jest.mock('aws-sdk')

config({ path: resolve(__dirname, '../.env') })

const secretsManagerClient = new SecretsManager({})

test('Fetch Secret Value: Valid Secret Name', async () => {
  expect.assertions(2)
  const secretValue = await getSecretValue(secretsManagerClient, 'my_secret_1')
  expect(Object.keys(secretValue)).toContain('SecretString')
  expect(secretValue['SecretString']).toEqual('test-value-1')
})

test('Fetch Secret Value: Invalid Secret Name', async () => {
  expect.assertions(1)
  try {
    return await getSecretValue(secretsManagerClient, 'foobarbaz')
  } catch (err) {
    expect(err).not.toBeNull()
  }
})

test('List Secrets', async () => {
  expect.assertions(1)
  const secretNames = await listSecrets(secretsManagerClient)
  expect(secretNames.sort()).toEqual(['my_secret_1', 'my_secret_2', 'my/secret/3'].sort())
})

test('Get Secret Value Map: parse=true, plain-text value', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my_secret_1', true)
  expect(secretValueMap).toMatchObject({ my_secret_1: 'test-value-1' })
})

test('Get Secret Value Map: parse=false, plain-text value', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my_secret_1', false)
  expect(secretValueMap).toMatchObject({ my_secret_1: 'test-value-1' })
})

test('Get Secret Value Map: parse=true, JSON string value', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my_secret_2', true)
  expect(secretValueMap).toMatchObject({ my_secret_2_foo: 'bar' })
})

test('Get Secret Value Map: parse=true, JSON string value, noPrefix=true', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my_secret_2', true, true)
  expect(secretValueMap).toMatchObject({ foo: 'bar' })
})

test('Get Secret Value Map: parse=false, JSON string value', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my_secret_2', false)
  expect(secretValueMap).toMatchObject({ my_secret_2: '{"foo" : "bar"}' })
})

test('Get Secret Value Map: parse=true, Base64 encoded JSON string value', async () => {
  expect.assertions(1)
  const secretValueMap = await getSecretValueMap(secretsManagerClient, 'my/secret/3', true)
  expect(secretValueMap).toMatchObject({ 'my/secret/3_foo': 'bar' })
})

test('Get Secret Value Map: Invalid Secret Name', async () => {
  expect.assertions(1)
  try {
    return await getSecretValueMap(secretsManagerClient, 'foobarbaz', false)
  } catch (err) {
    expect(err).not.toBeNull()
  }
})

test('Get Secret Names To Fetch: Single Wild Card Name', async () => {
  expect.assertions(1)
  const secretNames = await getSecretNamesToFetch(secretsManagerClient, ['*secret*'])
  expect(secretNames.sort()).toEqual(['my_secret_1', 'my_secret_2', 'my/secret/3'].sort())
})

test('Get Secret Names To Fetch: Multiple Wild Card Names', async () => {
  expect.assertions(1)
  const secretNames = await getSecretNamesToFetch(secretsManagerClient, ['my*', 'my_secret*', 'invalidfoobarbaz'])
  expect(secretNames.sort()).toEqual(['my_secret_1', 'my_secret_2', 'my/secret/3'].sort())
})
