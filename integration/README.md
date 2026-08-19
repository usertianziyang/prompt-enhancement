# Harness Integration

`deepseek-harness.patch` contains the tracked Harness integration changes for the prompt-enhancement packages.

Apply it before copying the two package directories:

```sh
git apply integration/deepseek-harness.patch
cp -R packages/prompt/prompt-enhancement /path/to/deepseek-harness/packages/prompt/prompt-enhancement
cp -R packages/client/ui-prompt-enhancement /path/to/deepseek-harness/packages/client/ui-prompt-enhancement
```

The patch is tied to the compatible Harness source revision. Resolve source-version drift before applying it to another revision.
