# Workspace Deployment Constraints

- **Hold Production Pushes**: Do NOT commit or push changes to the `main` branch. 
- **Only Push to UAT**: All new commits and changes should be pushed ONLY to the `uat` branch.
- **Production Merge**: Pushing to the `main` branch will only occur when the user explicitly instructs that the UAT is finalized and approved for production release.
