"use server"

import type { Objective } from "@/lib/types/operations"
import {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  getObjectives,
  updateGoal,
} from "./operations"

export {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  getObjectives,
  updateGoal,
}

export async function getObjectivesByGoal(
  goalId: string,
): Promise<Objective[]> {
  return getObjectives({ goal_id: goalId })
}
