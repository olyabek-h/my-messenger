import React, { useEffect, useMemo } from 'react'
import styles from './chat.module.scss'
import Head from '../components/head'
import ChatList from '../components/chatList'
import ChatItem from '../components/chatItem'
import ChatBox from '../components/chatBox'
import { chatSelected, chatBoxClosed, initDataLoaded, newUserRegistered, newMessageRecieved } from '../stateManager/actionCreator'
import { useAppState } from '../context/appStateContext'
import { useDispatch } from '../context/dispatchContext'
import { loadContacts, loadRecentChats, loadMessages, submitMessage } from '../services/services'
import io from 'socket.io-client'
import { baseUrl } from '../utility/request'

export default function Chat() {
  const { userId, chatList, messages, selectedChatId, searchedKeyword } = useAppState();
  const dispatch = useDispatch();

  const selectedChatInfo = useMemo(
    () => chatList.filter(chat => chat.id === selectedChatId)[0],
    [chatList, selectedChatId])
  const selectedChatMessages = useMemo(
    () => messages.filter(x => x.chatId === selectedChatId),
    [messages, selectedChatId])

  function handleChatSelect(chatId) {
    if (chatId === selectedChatId) {
      return;
    }
    loadMessages(chatId, userId)
      .then(data => {
        dispatch(chatSelected(chatId, data));
      })
  }

  function handleSubmitMessage(message) {
    submitMessage(selectedChatId, userId, message);
  }

  function handleCloseChatBox() {
    dispatch(chatBoxClosed());
  }

  useEffect(
    () => {
      Promise.all([
        loadContacts(userId),
        loadRecentChats(userId),
      ])
        .then(([contacts, chatList]) => {
          dispatch(initDataLoaded(
            {
              contacts,
              chatList,
            }
          ))
        })
    }, [userId, dispatch]
  )

  useEffect(() => {
    const socket = io(baseUrl);
    socket.emit('online', userId);

    socket.on('new-user', user => {
      dispatch(newUserRegistered(user));
    })

    socket.on('new-message', data => {
      dispatch(newMessageRecieved(data));
    })
  }, [dispatch, userId])                    //          10

  return (
    <div className={styles['layout']}>
      <div className={styles['side']}>
        <div className={styles['head']}>
          <Head />
        </div>
        <div className={styles['chatList']}>
          <ChatList>
            {chatList
              .filter(x => x.name.toLowerCase().includes(searchedKeyword.toLocaleLowerCase()))
              .map(chat => {
                const chatMessages = messages.filter(x => x.chatId === chat.id);
                const lastMessage = chatMessages[chatMessages.length - 1];
                return <ChatItem
                  key={chat.id}
                  name={chat.name}
                  avatar={chat.avatar}
                  unreadMessageCount={chat.unreadMessageCount}
                  lastMessage={lastMessage ? lastMessage.text : ''}
                  time={lastMessage ? lastMessage.time : ''}
                  selected={chat.id === selectedChatId}
                  onSelect={() => handleChatSelect(chat.id)}
                />
              })}
          </ChatList>
        </div>
      </div>
      <div className={styles['main']}>
        {selectedChatId &&
          <ChatBox
            avatar={selectedChatInfo.avatar}
            name={selectedChatInfo.name}
            onSubmitMessage={handleSubmitMessage}
            selectedChatId={selectedChatId}
            onClose={handleCloseChatBox}
            messages={
              selectedChatMessages.map(message => (
                {
                  id: message.id,
                  text: message.text,
                  time: message.time,
                  me: message.userId === userId
                }
              ))
            }
          />
        }
      </div>
    </div>
  )
}