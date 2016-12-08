'use strict'

import * as ALGOLIA from '../constants/algolia'
import * as CONSTANTS from '../constants/index'

import { arrayOf, normalize } from 'normalizr'

import algoliasearch from 'algoliasearch'
import { camelizeKeys } from 'humps'
import get from 'lodash/get'
import { article as articleSchema } from '../schemas/index'

const _ = {
  get
}

export function requestAuthorCollection(authorId) {
  return {
    type: CONSTANTS.FETCH_AUTHOR_COLLECTION_REQUEST,
    authorId
  }
}

export function failToReceiveAuthorCollection(error, failedAt) {
  return {
    type: CONSTANTS.FETCH_AUTHOR_COLLECTION_FAILURE,
    error,
    failedAt
  }
}

export function receiveAuthorCollection(authorId, items, collectIndexList, currentPage, isFinish, receivedAt) {
  let receiveAuthorCollection = {
    type: CONSTANTS.FETCH_AUTHOR_COLLECTION_SUCCESS,
    authorId,
    response: items
  }
  if (typeof authorId === 'string') {
    receiveAuthorCollection[authorId] = {
      collectIndexList,
      currentPage,
      isFinish,
      receivedAt
    }
  }
  return receiveAuthorCollection
}

export function fetchAuthorCollection(targetPage = 1, authorId='') {
  const maxResults = 3
  return (dispatch, getState) => { // eslint-disable-line no-unused-vars
    const searchParas = {
      hitsPerPage: maxResults,
      page: targetPage
    }
    let client = algoliasearch(ALGOLIA.APP_ID, ALGOLIA.SEARCH_API_KEY)
    let index = client.initIndex(ALGOLIA.POSTS_INDEX)
    dispatch(requestAuthorCollection(authorId))
    return index.search(authorId, searchParas)
      .then(function searchSuccess(content) {
        const hits = _.get(content, 'hits', {})
        const camelizedJson = camelizeKeys(hits)
        let items = normalize(camelizedJson, arrayOf(articleSchema))
        const collectIndexList = items.result
        const currentPage = content.page
        const isFinish = ( currentPage >= content.nbPages )
        const receivedAt = Date.now()
        return dispatch(receiveAuthorCollection(authorId, items, collectIndexList, currentPage, isFinish, receivedAt))
      })
      .catch(function searchFailure(error) {
        let failedAt = Date.now()
        return dispatch(failToReceiveAuthorCollection(error, failedAt))
      })
  }
}

export function fetchAuthorIfNeeded(authorId) {
  return (dispatch, getState) => {
    const state = getState()
    const isFetching = _.get(state, [ 'author', authorId, 'isFetching' ], false)
    const isFinish = _.get(state, [ 'author', authorId, 'isFinish' ], false)
    let targetPage = _.get(state, [ 'author', authorId, 'currentPage' ], 0) + 1
    if(!isFetching && !isFinish) {
      return dispatch(fetchAuthorCollection(targetPage,authorId))
    }
  }
}
