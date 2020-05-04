# AWS Secrets Manager GitHub Action
GitHub Action to fetch secrets from AWS Secrets Manager

## Usage
```yaml
steps:
 - name: Read secrets from AWS Secrets Manager into environment variables
   uses: action-factory/aws-secrets-manager-action@0.1
   with:
    aws_access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_access_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws_region: ${{ secrets.AWS_REGION }}
    secret_names: |
      my_secret_1
      my_secret_2
    parse_json: true
```

## Contributing
We would love for you to contribute to [`@action-factory/aws-secrets-manager-action`](https://github.com/action-factory/aws-secrets-manager-action). [Issues](https://github.com/action-factory/aws-secrets-manager-action/issues) and [Pull Requests](https://github.com/action-factory/aws-secrets-manager-action/pulls) are welcome!

## License
The scripts and documentation in this project are released under the [MIT License](https://github.com/action-factory/aws-secrets-manager-action/blob/master/LICENSE).