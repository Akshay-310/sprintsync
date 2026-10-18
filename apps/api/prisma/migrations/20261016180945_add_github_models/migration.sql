BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[GithubLink] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [repoFullName] NVARCHAR(200) NOT NULL,
    [webhookSecret] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GithubLink_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [GithubLink_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GithubLink_projectId_key] UNIQUE NONCLUSTERED ([projectId]),
    CONSTRAINT [GithubLink_repoFullName_key] UNIQUE NONCLUSTERED ([repoFullName])
);

-- CreateTable
CREATE TABLE [dbo].[PullRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [number] INT NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [state] NVARCHAR(20) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [authorLogin] NVARCHAR(100),
    [lastEventAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PullRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PullRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PullRequest_projectId_number_key] UNIQUE NONCLUSTERED ([projectId],[number])
);

-- CreateTable
CREATE TABLE [dbo].[TaskPullRequest] (
    [taskId] INT NOT NULL,
    [pullRequestId] INT NOT NULL,
    CONSTRAINT [TaskPullRequest_pkey] PRIMARY KEY CLUSTERED ([taskId],[pullRequestId])
);

-- CreateTable
CREATE TABLE [dbo].[WebhookEvent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [deliveryId] NVARCHAR(100) NOT NULL,
    [projectId] INT NOT NULL,
    [event] NVARCHAR(50) NOT NULL,
    [action] NVARCHAR(50),
    [outcome] NVARCHAR(30) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL CONSTRAINT [WebhookEvent_receivedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WebhookEvent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WebhookEvent_deliveryId_key] UNIQUE NONCLUSTERED ([deliveryId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WebhookEvent_projectId_receivedAt_idx] ON [dbo].[WebhookEvent]([projectId], [receivedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[GithubLink] ADD CONSTRAINT [GithubLink_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PullRequest] ADD CONSTRAINT [PullRequest_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskPullRequest] ADD CONSTRAINT [TaskPullRequest_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskPullRequest] ADD CONSTRAINT [TaskPullRequest_pullRequestId_fkey] FOREIGN KEY ([pullRequestId]) REFERENCES [dbo].[PullRequest]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WebhookEvent] ADD CONSTRAINT [WebhookEvent_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
