'use client';

import React from 'react';

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onQuestionClick }) => {
  const questions = [
    '¿De qué trata la lección de hoy?',
    '¿Cuál es el versículo para memorizar de esta semana?',
    '¿Cómo puedo aplicar esta lección a mi vida diaria?',
    'Profundiza en el tema principal de esta semana',
    '¿Qué dice Elena de White sobre el tema de hoy?',
    '¿Cuáles son los puntos clave de toda la semana?'
  ];

  return (
    <div className="px-3 py-3 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="w-full text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-md leading-tight"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
