import React from 'react';
import marketingImage from '../img/marketing-sales-team.png';

const ImageExample = () => {
  return (
    <div className="image-example">
      <h2>Imagens do Sistema</h2>
      
      <div className="image-card">
        <img 
          src={marketingImage} 
          alt="Equipe de Marketing e Vendas" 
          className="marketing-image"
        />
        <p>Equipe de Marketing e Vendas</p>
      </div>
      
      <div className="image-card">
        <img 
          src="/img/marketing-sales-team.png" 
          alt="Equipe de Marketing e Vendas (via public)" 
          className="marketing-image"
        />
        <p>Equipe (via caminho public)</p>
      </div>
    </div>
  );
};

export default ImageExample;


