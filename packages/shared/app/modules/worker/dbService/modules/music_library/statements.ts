import { LIST_IDS } from '@any-listen/common/constants'
import { getDB } from '../../db'

export interface MusicInfo {
  id: string
  list_id: string
  name: string
  singer: string
  interval: string | null
  is_local: number
  meta: string
  order: number
}

export interface MusicInfoOrder {
  list_id: string
  music_id: string
  order: number
}

export interface MusicInfoQuery {
  list_id: string
}

export interface MusicInfoRemove {
  list_id: string
  id: string
}

export interface ListMusicInfoQuery {
  list_id: string
  music_id: string
}

export interface UserListInfo {
  id: string
  parent_id: string | null
  name: string
  type: string
  meta: string
  position: number
}

/**
 * 创建所有默认列表查询语句
 * @returns 查询语句
 */
export const createDefaultListQueryStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    SELECT "id", "parent_id", "name", "type", "meta", "position"
    FROM "main"."my_list"
    WHERE "type"=='${LIST_IDS.DEFAULT}'
    `)
}

/**
 * 创建所有用户列表查询语句
 * @returns 查询语句
 */
export const createAllUserListQueryStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    SELECT "id", "parent_id", "name", "type", "meta", "position"
    FROM "main"."my_list"
    WHERE "type"!='${LIST_IDS.DEFAULT}'
    ORDER BY position ASC
    `)
}

/**
 * 创建单个列表查询语句
 * @returns 查询语句
 */
// export const createListQueryStatement = () => {
//   const db = getDB()
//   return db.prepare<[UserListInfo['parent_id']]>(`
//     SELECT "id", "parent_id", "name", "type", "meta", "position"
//     FROM "main"."my_list"
//     WHERE "id"=?
//     `)
// }

/**
 * 创建子列表查询语句
 * @returns 查询语句
 */
// export const createSubListQueryStatement = () => {
//   const db = getDB()
//   return db.prepare<[UserListInfo['parent_id']]>(`
//     SELECT "id", "parent_id", "name", "type", "meta", "position"
//     FROM "main"."my_list"
//     WHERE "parent_id"=?
//     ORDER BY position ASC
//     `)
// }

/**
 * 创建列表插入语句
 * @returns 插入语句
 */
export const createListInsertStatement = () => {
  const db = getDB()
  return db.prepare<[UserListInfo]>(`
    INSERT INTO "main"."my_list" ("id", "parent_id", "name", "type", "meta", "position")
    VALUES (@id, @parent_id, @name, @type, @meta, @position)`)
}

/**
 * 创建列表清空语句
 * @returns 清空语句
 */
export const createListClearStatement = () => {
  const db = getDB()
  return db.prepare<[UserListInfo['parent_id']]>(`
    DELETE FROM "main"."my_list"
    WHERE "parent_id"=? AND "type"!='${LIST_IDS.DEFAULT}'
  `)
}

/**
 * 创建列表清空语句
 * @returns 清空语句
 */
export const createListClearNullStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`
    DELETE FROM "main"."my_list"
    WHERE "parent_id" IS NULL AND "type"!='${LIST_IDS.DEFAULT}'
  `)
}

/**
 * 创建全部列表清空语句
 * @returns 清空语句
 */
export const createListClearAllStatement = () => {
  const db = getDB()
  return db.prepare<[]>(`DELETE FROM "main"."my_list" WHERE "type"!='${LIST_IDS.DEFAULT}'`)
}

/**
 * 创建列表删除语句
 * @returns 删除语句
 */
export const createListDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`DELETE FROM "main"."my_list" WHERE "id"=? AND "type"!='${LIST_IDS.DEFAULT}'`)
}

/**
 * 创建列表更新语句
 * @returns 更新语句
 */
export const createListUpdateStatement = () => {
  const db = getDB()
  return db.prepare<[UserListInfo]>(`
    UPDATE "main"."my_list"
    SET "name"=@name, "meta"=@meta
    WHERE "id"=@id`)
}

/**
 * 创建音乐信息查询语句
 * @returns 查询语句
 */
export const createMusicInfoQueryStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfoQuery]>(`
    SELECT mInfo."id", mInfo."name", mInfo."singer", mInfo."is_local", mInfo."interval", mInfo."meta"
    FROM my_list_music_info mInfo
    LEFT JOIN my_list_music_info_order O
    ON mInfo.id=O.music_id AND O.list_id=@list_id
    WHERE mInfo.list_id=@list_id
    ORDER BY O."order" ASC
    `)
}

/**
 * 创建音乐信息插入语句
 * @returns 插入语句
 */
export const createMusicInfoInsertStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfo]>(`
    INSERT INTO "main"."my_list_music_info" ("id", "list_id", "name", "singer", "is_local", "interval", "meta")
    VALUES (@id, @list_id, @name, @singer, @is_local, @interval, @meta)`)
}

/**
 * 创建音乐信息更新语句
 * @returns 更新语句
 */
export const createMusicInfoUpdateStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfo]>(`
    UPDATE "main"."my_list_music_info"
    SET "name"=@name, "singer"=@singer, "is_local"=@is_local, "interval"=@interval, "meta"=@meta
    WHERE "id"=@id AND "list_id"=@list_id`)
}

/**
 * 创建清空音乐信息语句
 * @returns 删除语句
 */
export const createMusicInfoClearStatement = () => {
  const db = getDB()
  return db.prepare<[]>('DELETE FROM "main"."my_list_music_info"')
}

/**
 * 创建根据列表id批量删除音乐信息语句
 * @returns 删除语句
 */
export const createMusicInfoDeleteByListIdStatement = () => {
  const db = getDB()
  return db.prepare<[string]>('DELETE FROM "main"."my_list_music_info" WHERE "list_id"=?')
}

/**
 * 创建根据列表Id与音乐id批量删除音乐信息语句
 * @returns 删除语句
 */
export const createMusicInfoDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfoRemove]>('DELETE FROM "main"."my_list_music_info" WHERE "id"=@id AND "list_id"=@list_id')
}

/**
 * 创建根据列表Id与音乐id查询音乐信息语句
 * @returns 删除语句
 */
export const createMusicInfoByListAndMusicInfoIdQueryStatement = () => {
  const db = getDB()
  return db.prepare<[ListMusicInfoQuery]>(`SELECT "id", "name", "singer", "is_local", "interval", "meta"
    FROM "main"."my_list_music_info"
    WHERE "id"=@music_id
    AND "list_id"=@list_id`)
}

/**
 * 创建根据音乐id查询音乐信息语句
 * @returns 删除语句
 */
export const createMusicInfoByMusicInfoIdQueryStatement = () => {
  const db = getDB()
  return db.prepare<[string]>(`SELECT "id", "name", "singer", "is_local", "interval", "meta", "list_id"
    FROM "main"."my_list_music_info"
    WHERE "id"=?`)
}

/**
 * 创建音乐信息排序插入语句
 * @returns 插入语句
 */
export const createMusicInfoOrderInsertStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfoOrder]>(`
    INSERT INTO "main"."my_list_music_info_order" ("list_id", "music_id", "order")
    VALUES (@list_id, @music_id, @order)`)
}

/**
 * 创建清空音乐排序语句
 * @returns 删除语句
 */
export const createMusicInfoOrderClearStatement = () => {
  const db = getDB()
  return db.prepare<[]>('DELETE FROM "main"."my_list_music_info_order"')
}

/**
 * 创建根据列表id删除音乐排序语句
 * @returns 删除语句
 */
export const createMusicInfoOrderDeleteByListIdStatement = () => {
  const db = getDB()
  return db.prepare<[string]>('DELETE FROM "main"."my_list_music_info_order" WHERE "list_id"=?')
}

/**
 * 创建根据列表Id与音乐id删除音乐排序语句
 * @returns 删除语句
 */
export const createMusicInfoOrderDeleteStatement = () => {
  const db = getDB()
  return db.prepare<[MusicInfoRemove]>(
    'DELETE FROM "main"."my_list_music_info_order" WHERE "music_id"=@id AND "list_id"=@list_id'
  )
}
