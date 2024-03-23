import { threadCreated } from './threadCreated'
import { threadMessageCreated } from './threadMessageCreated'
import { threadMessageDelta } from './threadMessageDelta'
import { threadMessageCompleted } from './threadMessageCompleted'
import { threadRunCreated } from './threadRunCreated'
import { threadRunStepCreated } from './threadRunStepCreated'
import { threadRunStepDelta } from './threadRunStepDelta'
import { threadRunStepCompleted } from './threadRunStepCompleted'

export const handlers = {
  'thread.created': threadCreated,
  'thread.message.created': threadMessageCreated,
  'thread.message.delta': threadMessageDelta,
  'thread.message.completed': threadMessageCompleted,
  'thread.run.created': threadRunCreated,
  'thread.run.step.created': threadRunStepCreated,
  'thread.run.step.delta': threadRunStepDelta,
  'thread.run.step.completed': threadRunStepCompleted,
}
