/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';

const QUOTE = "“Every conversation is an opportunity to build trust, solve problems, and create value”";
const AUTHOR = "— Jo Lernout, CEO of Botsthere, Kithai, & CallerPro";

const WelcomeScreen: React.FC = () => {
  const [quoteText, setQuoteText] = useState('');
  const [authorText, setAuthorText] = useState('');
  const [typingQuote, setTypingQuote] = useState(true);
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    if (typingQuote) {
      if (quoteText.length < QUOTE.length) {
        const timeout = setTimeout(() => {
          setQuoteText(QUOTE.slice(0, quoteText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        setTypingQuote(false); // Finished typing quote, start author
      }
    } else if (!isTypingDone) {
      if (authorText.length < AUTHOR.length) {
        const timeout = setTimeout(() => {
          setAuthorText(AUTHOR.slice(0, authorText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        setIsTypingDone(true); // Finished typing author
      }
    }
  }, [quoteText, authorText, typingQuote, isTypingDone]);

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="typewriter-quote-container">
          <p className={`quote-text ${isTypingDone ? 'typing-done' : ''}`}>
            {quoteText}
            {typingQuote && <span className="cursor">|</span>}
          </p>
          <p className={`quote-author ${isTypingDone ? 'typing-done' : ''}`}>
            <em>{authorText}</em>
            {!typingQuote && !isTypingDone && <span className="cursor">|</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
