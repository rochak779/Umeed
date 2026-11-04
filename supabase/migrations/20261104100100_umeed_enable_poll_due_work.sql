-- Switch the every-minute umeed-poll-due-work job back on now that a run
-- finishes in about a second (it had been paused while runs took minutes).
-- Touches only Umeed's own cron job.
select cron.alter_job(jobid, active := true)
from cron.job
where jobname = 'umeed-poll-due-work';
