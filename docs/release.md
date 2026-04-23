# Release Process

## Overview

Releases are created in two steps:

1. `release-please` opens or updates the release PR on `master`.
2. After the release PR is merged, production is promoted manually.

The production workflow does not build again. It reuses the Docker image that was already built from `master`.

## Normal Flow

1. Merge the release PR created by `release-please`.
2. Wait until the `dockerhub.yml` workflow has built and pushed the image for that commit.
3. Open the GitHub Actions workflow `Release docker image and deploy to Production`.
4. Run the workflow manually with `target_ref` set to the release commit SHA or ref.
5. Wait for the workflow to:
   - resolve the existing Docker digest
   - deploy it to DigitalOcean production
   - tag the image as `vX.Y.Z` and `latest`
   - create the GitHub release

## How to find the correct commit SHA

Use the commit that was merged from the release PR.

The easiest way is:

1. Open the merged release PR on GitHub.
2. Copy the merge commit SHA from the PR timeline or the commit list.
3. Use that SHA as `target_ref` when running the production workflow.

You can also open the last successful `Build docker image and push to DockerHub & DigitalOcean Dev` workflow run and copy the commit SHA from that run.

## Important Notes

- Development always deploys the newest digest built from `master`.
- Production only deploys the digest of the manually promoted release commit.
- If the production deploy fails, fix the issue and run the production workflow again.
- The GitHub release is only created after the production deploy succeeds.
