BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(255) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Project] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(200) NOT NULL,
    [keyPrefix] NVARCHAR(10) NOT NULL,
    [taskCounter] INT NOT NULL CONSTRAINT [Project_taskCounter_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Project_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Project_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Project_keyPrefix_key] UNIQUE NONCLUSTERED ([keyPrefix])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectMember] (
    [projectId] INT NOT NULL,
    [userId] INT NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [ProjectMember_role_df] DEFAULT 'member',
    CONSTRAINT [ProjectMember_pkey] PRIMARY KEY CLUSTERED ([projectId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[Sprint] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [goal] NVARCHAR(500),
    [startsAt] DATETIME2 NOT NULL,
    [endsAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Sprint_status_df] DEFAULT 'PLANNED',
    CONSTRAINT [Sprint_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Task] (
    [id] INT NOT NULL IDENTITY(1,1),
    [projectId] INT NOT NULL,
    [number] INT NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(max),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Task_status_df] DEFAULT 'TODO',
    [points] INT,
    [sprintId] INT,
    [assigneeId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Task_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [completedAt] DATETIME2,
    CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Task_projectId_number_key] UNIQUE NONCLUSTERED ([projectId],[number])
);

-- CreateTable
CREATE TABLE [dbo].[TaskStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [fromStatus] NVARCHAR(20),
    [toStatus] NVARCHAR(20) NOT NULL,
    [source] NVARCHAR(20) NOT NULL,
    [changedById] INT,
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [TaskStatusHistory_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TaskStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_projectId_status_idx] ON [dbo].[Task]([projectId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStatusHistory_taskId_changedAt_idx] ON [dbo].[TaskStatusHistory]([taskId], [changedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[ProjectMember] ADD CONSTRAINT [ProjectMember_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectMember] ADD CONSTRAINT [ProjectMember_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Sprint] ADD CONSTRAINT [Sprint_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[Project]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_sprintId_fkey] FOREIGN KEY ([sprintId]) REFERENCES [dbo].[Sprint]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_assigneeId_fkey] FOREIGN KEY ([assigneeId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskStatusHistory] ADD CONSTRAINT [TaskStatusHistory_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskStatusHistory] ADD CONSTRAINT [TaskStatusHistory_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
