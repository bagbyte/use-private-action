# `bagbyte/use-private-action` GitHub action

This action allow to use custom actions in private GitHub repository.

## Usage

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
        ...
        steps:
            - uses: bagbyte/use-private-action@v0.0.2
              with:
                  action: 
                  token: ${{ secrets.PRIVATE_REPO_ACCESS_TOKEN }}
            - ... other steps
```

**Note:** both `action` and `token` are required fields. `action` has the same format as the value you can use in the `uses`: `{org}/{repo}[/path]@ref`

## Prerequisites

### Access Token

To access private repositories, you need to create an access token. To create a new access token:
1. Access your Developer Settings on this (page)[https://github.com/settings/tokens] 
2. Click on `Generate new token` button
3. Enter your password to confirm your identity
4. Assign a name to this token (i.e. `Github actions private repository`)
5. Select `repo` (this allows this access token to access your repositories)
6. Copy the generated token (once you leave this page the value will not be accessible anymore, so take care of pasting somewhere)

### Secrets

We need to create a Secret, in th repository where you will use this action. To do that:
1. Go to your repository `Settings > Secrets`
2. Click on `Add ay new secret` link
3. Choose a name for this secret (i.e. `PRIVATE_REPO_ACCESS_TOKEN`), and add the previously copied value of the token in the `Value` box


## Knowing issues and limitation

### Build your code

In case your action is written in `Typescript`, the repository should contain the build folder.

### Commit your `node_modules` folder

Your private repository must have `node_modules` folder committed. 

### Expose your main activity function

To allow this action to execute and run your code, you should export the main function in your private action main file.

```js
// dist/main.js

...

export function start() {
    ...
}

...

start();
```

### Actions supported

Right now it supports only nodejs actions.
