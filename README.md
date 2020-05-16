# AWS Secrets Manager GitHub Action
[![Tests](https://github.com/action-factory/aws-secrets-manager-action/workflows/Tests/badge.svg?branch=master)](https://github.com/action-factory/aws-secrets-manager-action/actions?query=workflow%3A%22Tests%22)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/action-factory/aws-secrets-manager-action/blob/master/LICENSE)

GitHub Action to fetch secrets from AWS Secrets Manager. 

## Usage
```yaml
steps:
 - name: Read secrets from AWS Secrets Manager into environment variables
   uses: action-factory/aws-secrets-manager-action@v0.3.0
   with:
    aws_access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws_region: ${{ secrets.AWS_REGION }}
    secrets: |
      my_secret_1_name
      app1/dev/*
    parse_json: true
```
- `aws_access_key_id`
  - Access Key ID of an IAM user with the required [AWS Secrets Manager permissions](#iam-policy)
- `aws_secret_access_key`
  - Corresponding Secret Access Key of the IAM user
- `aws_region`
  - AWS region code which has your AWS Secrets Manager secrets 
  - Example: `us-east-1`
- `secrets`: 
  - List of secret names to be retrieved
  - Examples:
    - To retrieve a single secret, use `secrets: my_secret_1_name`
    - To retrieve multiple secrets, use: 
      ```yaml
      secrets: |
        my_secret_1_name
        my_secret_2_name
      ```
    - To retrieve all secrets having names that contain `dev` or begin with `app1/dev/`, use:
      ```yaml
      secrets: |
        *dev*
        app1/dev/*
      ```
- `parse_json`
  - Secret values can be plain text strings or stringified JSON objects (valid or invalid!).
  - If `parse_json: true` and secret value is a valid stringified JSON object, it will be parsed and flattened. Each of its key value pairs will become individual secrets.
  - Examples: 

| `parse_json` | Actual Secrets<br>(`name` = `value`)         | Parsed Secrets<br>(`name` = `value`) | Explanation                                                                             |
|--------------|----------------------------------------------|--------------------------------------|-----------------------------------------------------------------------------------------|
| `true`       | `foo` = `{ "bar": "baz" }`                   | `foo.bar` = `baz`                    | Values that can be parsed into a JSON will be parsed and flattened                      |
| `true`       | `foo` = `{ "bar" = "baz" }`                  | `foo` = `{ "bar" = "baz" }`          | Values that cannot be parsed into a JSON will not be parsed                             |
| `true`       | `foo` = `{ "bar": "baz" }`<br>`ham` = `eggs` | `foo.bar` = `baz` <br>`ham` = `eggs` | If multiple secrets, values that can be parsed into a JSON will be parsed and flattened |
| `false`      | `foo` = `{ "bar": "baz" }`                   | `foo` = `{ "bar": "baz" }`           | Not parsed                                                                              |

#### Note:
- `${{ secrets.YOUR_SECRET_NAME }}` refers to [GitHub Secrets](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets). Create the required secrets (e.g.: AWS credentials) in your GitHub repository before using this GitHub Action.
- AWS credentials can be omitted if they are provided in the environment, per https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
- Secrets are added to the environment (env) using the same key as used in Secrets Manager, i.e. env.foo will refer to the secret with the name foo.
- For secret names that are not POSIX compliant, a second environment variable will be set that is POSIX compliant, i.e. /foo/bar.value will be stored in the environment as /foo/bar.value and also as \_foo\_bar\_value

## Features
- Can fetch secrets from AWS Secrets Manager and inject them into environment variables which can be used in subsequent steps in your workflow. 
- Can fetch multiple secrets at once
- Supports wildcards
  - `secrets: 'app1/dev/*'` will fetch all secrets having names that begin with `app1/dev/`
  - `secrets: '*dev*'` will fetch all secrets that have `dev` in their names

## IAM Policy
The `aws_access_key_id` and `aws_secret_access_key` used above should belong to an IAM user with the following minimum permissions:
- `secretsmanager:GetSecretValue`
- `kms:Decrypt`
  - required only if you use a customer-managed AWS KMS key to encrypt the secret. You do not need this permission to use your account's default AWS managed encryption key for Secrets Manager.

#### Example 1:
 If your secrets are encrypted using the default AWS managed encryption key, then the IAM user needs to have a policy attached similar to:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Effect": "Allow",
            "Resource": "*"
        }
    ]
}
```

#### Example 2:
 If your secrets are encrypted using a customer managed AWS Key Management Service (KMS) key, then the IAM user needs a policy similar to the one below. We can restrict access to specific secrets (resources) in a specific region or we can use `*` for 'Any'.
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "secretsmanager:GetSecretValue",
                "kms:Decrypt"
            ],
            "Effect": "Allow",
            "Resource": [
              "arn:aws:secretsmanager:us-east-1:000000000000:secret:*",
              "arn:aws:secretsmanager:*:000000000000:secret:mySecretID"
            ]
        }
    ]
}
```
Here `us-east-1` is the region code which has the secrets, `000000000000` is your [AWS account ID](https://console.aws.amazon.com/billing/home?#/account) and `mySecretID` is the ID of your secret (usually different from a secret name, refer to AWS Secrets Manager console for the exact ID).

## Contributing
We would love for you to contribute to [`@action-factory/aws-secrets-manager-action`](https://github.com/action-factory/aws-secrets-manager-action). [Issues](https://github.com/action-factory/aws-secrets-manager-action/issues) and [Pull Requests](https://github.com/action-factory/aws-secrets-manager-action/pulls) are welcome!

## License
The scripts and documentation in this project are released under the [MIT License](https://github.com/action-factory/aws-secrets-manager-action/blob/master/LICENSE).
